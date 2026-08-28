// The daily loop, end to end through the real Worker (DESIGN.md §7 This week,
// §10, Q-08).
//
// This is the surface used ~180 times per person, so what is asserted here is
// the set of ways it can quietly lie: a second device inflating days worked, an
// undo taking a day back with it, a swap spending a budget it should not have,
// and a past week going dead.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith('.sql')) return nextLoad(url, context);
    const text = readFileSync(new URL(url), 'utf8');
    return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(text)};` };
  },
});

const { FakeD1 } = await import('./d1.js');
const worker = (await import('../src/index.js')).default;
const { applyPending } = await import('../src/lib/migrations.js');
const { MIGRATIONS, SEEDS } = await import('../src/migrations/index.js');
const { runSeed } = await import('../src/lib/seed.js');
const { issueSessionCookie } = await import('../src/lib/auth.js');
const { todayIn } = await import('../src/lib/dates.js');

const ADMIN_TOKEN = 'test-token';
const FAMILY_TZ = 'America/Chicago';

async function env() {
  const DB = new FakeD1();
  await applyPending(DB, MIGRATIONS);
  const e = { DB, ADMIN_TOKEN, FAMILY_PASSCODE: 'wanderlust', FAMILY_TZ };
  await runSeed(DB, SEEDS);
  return e;
}

async function call(e, personId, path, init = {}) {
  const cookie = (await issueSessionCookie(e, personId)).split(';')[0];
  const headers = { cookie, ...(init.headers || {}) };
  if (init.body) headers['content-type'] = 'application/json';
  const res = await worker.fetch(new Request(`https://example.test${path}`, {
    ...init,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  }), e);
  return { res, body: await res.json() };
}

const futureSeptember = () => `${new Date().getUTCFullYear() + 2}-09`;

// A plan for person 1, drawn from the real seed.
async function plan(e, personId = 1, month = futureSeptember()) {
  const { body } = await call(e, personId, '/api/plans', {
    method: 'POST',
    body: { month, country_id: 1, focus_id: 1, project_type_id: 1 },
  });
  return body;
}

const tasksOf = (body) => body.weeks.flatMap((w) => w.tasks);
const weekTasks = (body, week) => body.weeks.find((w) => w.week_no === week).tasks;
const find = (body, id) => tasksOf(body).find((t) => t.id === id);

const sessionCount = async (e, planId) =>
  (await e.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE plan_id = ?').bind(planId).first()).n;

const daysWorked = async (e, personId) => {
  const { body } = await call(e, personId, '/api/stats');
  return body.stats[0].days_worked;
};

// ------------------------------------------------------------- check off --

test('done marks the task, stamps completed_at and writes one session', async () => {
  const e = await env();
  const p = await plan(e);
  const task = weekTasks(p, 1)[0];

  const { res, body } = await call(e, 1, `/api/tasks/${task.id}`, {
    method: 'PATCH', body: { status: 'done' },
  });

  assert.equal(res.status, 200);
  const after = find(body, task.id);
  assert.equal(after.status, 'done');
  assert.match(after.completed_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(after.session_count, 1);
  assert.equal(body.done_count, 1);
  assert.equal(body.total, 20);
  assert.equal(await sessionCount(e, p.plan.id), 1);
});

// Q-08. Two devices, or one double-tap on a slow connection.
test('sending done twice writes one session and answers 200 both times', async () => {
  const e = await env();
  const p = await plan(e);
  const task = weekTasks(p, 2)[0];

  const first = await call(e, 1, `/api/tasks/${task.id}`, { method: 'PATCH', body: { status: 'done' } });
  const second = await call(e, 1, `/api/tasks/${task.id}`, { method: 'PATCH', body: { status: 'done' } });

  assert.equal(first.res.status, 200);
  assert.equal(second.res.status, 200);
  assert.equal(find(second.body, task.id).status, 'done');
  assert.equal(second.body.done_count, 1);
  assert.equal(await sessionCount(e, p.plan.id), 1);
  assert.equal(await daysWorked(e, 1), 1);
});

test('undo reopens the task and does not reduce days worked', async () => {
  const e = await env();
  const p = await plan(e);
  const task = weekTasks(p, 1)[0];

  await call(e, 1, `/api/tasks/${task.id}`, { method: 'PATCH', body: { status: 'done' } });
  assert.equal(await daysWorked(e, 1), 1);

  const { body } = await call(e, 1, `/api/tasks/${task.id}`, { method: 'PATCH', body: { status: 'open' } });

  const after = find(body, task.id);
  assert.equal(after.status, 'open');
  assert.equal(after.completed_at, null);
  assert.equal(body.done_count, 0);
  // The session row is left exactly where it was, which is the whole point:
  // deleting it would take the day with it (§10).
  assert.equal(after.session_count, 1);
  assert.equal(await daysWorked(e, 1), 1);
});

test('undo on an already-open task changes nothing and writes nothing', async () => {
  const e = await env();
  const p = await plan(e);
  const task = weekTasks(p, 1)[0];

  const { res, body } = await call(e, 1, `/api/tasks/${task.id}`, {
    method: 'PATCH', body: { status: 'open' },
  });

  assert.equal(res.status, 200);
  assert.equal(find(body, task.id).status, 'open');
  assert.equal(await sessionCount(e, p.plan.id), 0);
});

test('a week-1 task checked off in week 3 still checks off — no lockout, ever', async () => {
  const e = await env();
  const p = await plan(e);
  // start_date moved two weeks into the past, which is what "it is week 3 now"
  // means to this app: the week is derived, never stored.
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 15);
  await e.DB.prepare('UPDATE month_plans SET start_date = ? WHERE id = ?')
    .bind(start.toISOString().slice(0, 10), p.plan.id).run();

  const stale = weekTasks(p, 1)[2];
  const { res, body } = await call(e, 1, `/api/tasks/${stale.id}`, {
    method: 'PATCH', body: { status: 'done' },
  });

  assert.equal(res.status, 200);
  assert.equal(find(body, stale.id).status, 'done');
  assert.ok(body.current_week >= 3);
});

test('a task is either open or done, and nothing else', async () => {
  const e = await env();
  const p = await plan(e);
  const task = weekTasks(p, 1)[0];

  for (const status of ['skipped', '', null, undefined, 'DONE']) {
    const { res } = await call(e, 1, `/api/tasks/${task.id}`, { method: 'PATCH', body: { status } });
    assert.equal(res.status, 400, `status ${JSON.stringify(status)}`);
  }
  assert.equal(await sessionCount(e, p.plan.id), 0);
});

test('a sibling can check off someone else’s task — there are no roles', async () => {
  const e = await env();
  const p = await plan(e, 1);
  const task = weekTasks(p, 1)[0];

  const { res, body } = await call(e, 2, `/api/tasks/${task.id}`, {
    method: 'PATCH', body: { status: 'done' },
  });

  assert.equal(res.status, 200);
  assert.equal(find(body, task.id).status, 'done');
  // The day lands against the plan's person, not the device's.
  assert.equal(await daysWorked(e, 1), 1);
  assert.equal(await daysWorked(e, 2), 0);
});

test('a task that does not exist is a 404', async () => {
  const e = await env();
  const { res } = await call(e, 1, '/api/tasks/9999', { method: 'PATCH', body: { status: 'done' } });
  assert.equal(res.status, 404);
});

// ----------------------------------------------------------------- swap --

test('swap replaces in place and names what it replaced', async () => {
  const e = await env();
  const p = await plan(e);
  const task = weekTasks(p, 2)[1];

  const { res, body } = await call(e, 1, `/api/tasks/${task.id}/swap`, { method: 'POST' });

  assert.equal(res.status, 200);
  const after = find(body, task.id);
  assert.equal(after.week_no, 2);
  assert.equal(after.position, task.position);
  assert.notEqual(after.task_template_id, task.task_template_id);
  assert.equal(after.swapped_from, task.task_template_id);
  assert.equal(after.swapped_from_title, task.title);
  assert.equal(body.swaps_used, 1);
  assert.equal(body.swaps_left, 2);
  assert.equal(tasksOf(body).length, 20);
});

test('a swap never draws a template the plan already holds', async () => {
  const e = await env();
  const p = await plan(e);
  let body = p;

  for (const slot of [0, 1, 2]) {
    const task = weekTasks(body, 2)[slot];
    ({ body } = await call(e, 1, `/api/tasks/${task.id}/swap`, { method: 'POST' }));
  }

  const ids = tasksOf(body).map((t) => t.task_template_id);
  assert.equal(new Set(ids).size, 20);
});

test('the fourth swap is refused', async () => {
  const e = await env();
  const p = await plan(e);
  let body = p;

  for (const slot of [0, 1, 2]) {
    const task = weekTasks(body, 2)[slot];
    ({ body } = await call(e, 1, `/api/tasks/${task.id}/swap`, { method: 'POST' }));
  }
  assert.equal(body.swaps_left, 0);

  const fourth = weekTasks(body, 3)[0];
  const { res, body: refused } = await call(e, 1, `/api/tasks/${fourth.id}/swap`, { method: 'POST' });
  assert.equal(res.status, 409);
  assert.match(refused.error, /3 swaps/);
});

test('a redraw resets the swap budget, because it destroys what the swaps bought', async () => {
  const e = await env();
  const p = await plan(e);

  const task = weekTasks(p, 2)[0];
  const swapped = await call(e, 1, `/api/tasks/${task.id}/swap`, { method: 'POST' });
  assert.equal(swapped.body.swaps_used, 1);

  const { body } = await call(e, 1, `/api/plans/${p.plan.id}/redraw`, { method: 'POST' });
  assert.equal(body.swaps_used, 0);
  assert.equal(body.swaps_left, 3);
});

test('swap is refused on the four week-1 core tasks and offered on the fifth', async () => {
  const e = await env();
  const p = await plan(e);
  const week1 = weekTasks(p, 1);

  for (const task of week1.filter((t) => t.tier === 'core')) {
    assert.equal(task.swappable, false);
    const { res } = await call(e, 1, `/api/tasks/${task.id}/swap`, { method: 'POST' });
    assert.equal(res.status, 409);
  }

  const fifth = week1.find((t) => t.position === 5);
  assert.equal(fifth.swappable, true);
  const { res, body } = await call(e, 1, `/api/tasks/${fifth.id}/swap`, { method: 'POST' });
  assert.equal(res.status, 200);
  assert.equal(find(body, fifth.id).week_no, 1);
  assert.equal(find(body, fifth.id).position, 5);
});

test('swap is refused on all of week 4', async () => {
  const e = await env();
  const p = await plan(e);

  for (const task of weekTasks(p, 4)) {
    assert.equal(task.swappable, false);
    const { res, body } = await call(e, 1, `/api/tasks/${task.id}/swap`, { method: 'POST' });
    assert.equal(res.status, 409);
    assert.match(body.error, /sequence/);
  }
});

test('swap is refused on a task already done', async () => {
  const e = await env();
  const p = await plan(e);
  const task = weekTasks(p, 3)[0];

  await call(e, 1, `/api/tasks/${task.id}`, { method: 'PATCH', body: { status: 'done' } });
  const { res } = await call(e, 1, `/api/tasks/${task.id}/swap`, { method: 'POST' });
  assert.equal(res.status, 409);
});

test('swap belongs to the plan’s owner', async () => {
  const e = await env();
  const p = await plan(e, 1);
  const task = weekTasks(p, 2)[0];

  const { res } = await call(e, 2, `/api/tasks/${task.id}/swap`, { method: 'POST' });
  assert.equal(res.status, 403);
});

// ------------------------------------------------------------ the weeks --

test('current_week is derived from start_date and folds the remainder into week 4', async () => {
  const e = await env();
  const p = await plan(e);

  // Counted back from the family's own today, not from UTC's. weekOf reads the
  // clock through FAMILY_TZ, so a UTC base makes every offset a day late for
  // the six hours a night the two dates disagree.
  const at = async (offsetDays) => {
    const start = new Date(`${todayIn(FAMILY_TZ)}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - offsetDays);
    await e.DB.prepare('UPDATE month_plans SET start_date = ? WHERE id = ?')
      .bind(start.toISOString().slice(0, 10), p.plan.id).run();
    const { body } = await call(e, 1, `/api/plans/${p.plan.id}`);
    return body.current_week;
  };

  assert.equal(await at(0), 1);
  assert.equal(await at(6), 1);
  assert.equal(await at(7), 2);
  assert.equal(await at(20), 3);
  assert.equal(await at(21), 4);
  assert.equal(await at(45), 4);   // a month that ran long stays in week 4
});

test('a plan whose start date has not arrived yet is on week 1', async () => {
  const e = await env();
  const p = await plan(e);
  // futureSeptember is two years out, so start_date is ahead of today already.
  assert.ok(p.plan.start_date > new Date().toISOString().slice(0, 10));
  assert.equal(p.current_week, 1);
});
