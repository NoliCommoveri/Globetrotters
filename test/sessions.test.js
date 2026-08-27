// Sessions and the two numbers they feed (DESIGN.md §5, §7, §10).
//
// A session is a day somebody sat down, not a task they finished. Everything
// asserted here is about keeping those two apart: "Worked on it" has to leave a
// visible mark without completing anything, `local_date` has to be the family's
// day rather than the Worker's, and days-worked has to count days rather than
// rows.

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

async function env(tz = FAMILY_TZ) {
  const DB = new FakeD1();
  await applyPending(DB, MIGRATIONS);
  const e = { DB, ADMIN_TOKEN, FAMILY_PASSCODE: 'wanderlust', FAMILY_TZ: tz };
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

async function plan(e, personId = 1, month = futureSeptember()) {
  const { body } = await call(e, personId, '/api/plans', {
    method: 'POST',
    body: { month, country_id: 1, focus_id: 1, project_type_id: 1 },
  });
  return body;
}

const tasksOf = (body) => body.weeks.flatMap((w) => w.tasks);
const find = (body, id) => tasksOf(body).find((t) => t.id === id);
const firstTask = (body) => body.weeks[0].tasks[0];

// ----------------------------------------------------------- worked on it --

test('a session against an open task leaves it open and marks it in progress', async () => {
  const e = await env();
  const p = await plan(e);
  const task = firstTask(p);

  const { res, body } = await call(e, 1, '/api/sessions', {
    method: 'POST', body: { plan_id: p.plan.id, plan_task_id: task.id },
  });

  assert.equal(res.status, 201);
  const after = find(body, task.id);
  assert.equal(after.status, 'open');
  assert.equal(after.session_count, 1);
  assert.equal(body.done_count, 0);
});

test('two sittings on one task on one day are one day worked', async () => {
  const e = await env();
  const p = await plan(e);
  const task = firstTask(p);

  await call(e, 1, '/api/sessions', { method: 'POST', body: { plan_id: p.plan.id, plan_task_id: task.id } });
  const { body } = await call(e, 1, '/api/sessions', {
    method: 'POST', body: { plan_id: p.plan.id, plan_task_id: task.id },
  });

  assert.equal(find(body, task.id).session_count, 2);
  const { body: stats } = await call(e, 1, '/api/stats');
  assert.equal(stats.stats[0].days_worked, 1);
});

test('a session needs no task at all', async () => {
  const e = await env();
  const p = await plan(e);

  const { res, body } = await call(e, 1, '/api/sessions', {
    method: 'POST', body: { plan_id: p.plan.id },
  });

  assert.equal(res.status, 201);
  assert.equal(body.session.plan_task_id, null);
  assert.equal(body.done_count, 0);
});

test('local_date is the family’s day, written at insert', async () => {
  const e = await env('Pacific/Kiritimati');   // UTC+14, so it is often tomorrow there
  const p = await plan(e);

  const { body } = await call(e, 1, '/api/sessions', { method: 'POST', body: { plan_id: p.plan.id } });

  assert.equal(body.session.local_date, todayIn('Pacific/Kiritimati'));
  assert.match(body.session.logged_at, /^\d{4}-\d{2}-\d{2}T/);
});

test('a session cannot point at another month’s task', async () => {
  const e = await env();
  const mine = await plan(e, 1);
  const theirs = await plan(e, 2);

  const { res } = await call(e, 1, '/api/sessions', {
    method: 'POST', body: { plan_id: mine.plan.id, plan_task_id: firstTask(theirs).id },
  });

  assert.equal(res.status, 400);
});

test('a session needs a plan that exists', async () => {
  const e = await env();
  assert.equal((await call(e, 1, '/api/sessions', { method: 'POST', body: {} })).res.status, 400);
  assert.equal(
    (await call(e, 1, '/api/sessions', { method: 'POST', body: { plan_id: 9999 } })).res.status,
    404,
  );
});

test('minutes is optional and refuses nonsense', async () => {
  const e = await env();
  const p = await plan(e);

  const ok = await call(e, 1, '/api/sessions', { method: 'POST', body: { plan_id: p.plan.id, minutes: 10 } });
  assert.equal(ok.res.status, 201);
  assert.equal(ok.body.session.minutes, 10);

  for (const minutes of [-1, 1441, 'ten', 1.5]) {
    const { res } = await call(e, 1, '/api/sessions', { method: 'POST', body: { plan_id: p.plan.id, minutes } });
    assert.equal(res.status, 400, `minutes ${minutes}`);
  }
});

// ---------------------------------------------------------------- notes --

test('a note lands on the plan’s notes with the task it came from', async () => {
  const e = await env();
  const p = await plan(e);
  const task = firstTask(p);

  await call(e, 1, `/api/tasks/${task.id}`, { method: 'PATCH', body: { status: 'done' } });
  const { body } = await call(e, 1, '/api/sessions', {
    method: 'POST',
    body: { plan_id: p.plan.id, plan_task_id: task.id, note: '  They drive on the left.  ' },
  });

  assert.equal(body.notes.length, 1);
  assert.equal(body.notes[0].note, 'They drive on the left.');
  assert.equal(body.notes[0].task_title, task.title);
  assert.equal(body.notes[0].local_date, todayIn(FAMILY_TZ));
});

test('a skipped note writes no note, and the check-off’s own session carries none', async () => {
  const e = await env();
  const p = await plan(e);
  const task = firstTask(p);

  await call(e, 1, `/api/tasks/${task.id}`, { method: 'PATCH', body: { status: 'done' } });
  const { body } = await call(e, 1, '/api/sessions', {
    method: 'POST', body: { plan_id: p.plan.id, plan_task_id: task.id, note: '   ' },
  });

  assert.deepEqual(body.notes, []);
});

test('notes accumulate down the page in the order they were written', async () => {
  const e = await env();
  const p = await plan(e);
  const [a, b] = p.weeks[0].tasks;

  await call(e, 1, '/api/sessions', { method: 'POST', body: { plan_id: p.plan.id, plan_task_id: a.id, note: 'first' } });
  const { body } = await call(e, 1, '/api/sessions', {
    method: 'POST', body: { plan_id: p.plan.id, plan_task_id: b.id, note: 'second' },
  });

  assert.deepEqual(body.notes.map((n) => n.note), ['first', 'second']);
});

test('a note is one line and is cut at 280 characters', async () => {
  const e = await env();
  const p = await plan(e);

  const { body } = await call(e, 1, '/api/sessions', {
    method: 'POST', body: { plan_id: p.plan.id, note: 'x'.repeat(400) },
  });

  assert.equal(body.notes[0].note.length, 280);
});

// ---------------------------------------------------------------- stats --

test('days worked is cumulative across months and counts days, not tasks', async () => {
  const e = await env();
  const september = await plan(e, 1, `${new Date().getUTCFullYear() + 2}-09`);
  const october = await plan(e, 1, `${new Date().getUTCFullYear() + 2}-10`);

  // Three check-offs today across two months: three tasks, one day.
  for (const task of september.weeks[0].tasks.slice(0, 2)) {
    await call(e, 1, `/api/tasks/${task.id}`, { method: 'PATCH', body: { status: 'done' } });
  }
  await call(e, 1, `/api/tasks/${october.weeks[0].tasks[0].id}`, {
    method: 'PATCH', body: { status: 'done' },
  });

  const { body } = await call(e, 1, '/api/stats');
  assert.equal(body.stats.length, 1);
  assert.equal(body.stats[0].person_id, 1);
  assert.equal(body.stats[0].days_worked, 1);
  assert.equal(body.stats[0].tasks_done, 3);
});

test('a second day is a second day worked', async () => {
  const e = await env();
  const p = await plan(e);

  await call(e, 1, '/api/sessions', { method: 'POST', body: { plan_id: p.plan.id } });
  await e.DB.prepare("UPDATE sessions SET local_date = '2000-01-01' WHERE plan_id = ?")
    .bind(p.plan.id).run();
  await call(e, 1, '/api/sessions', { method: 'POST', body: { plan_id: p.plan.id } });

  const { body } = await call(e, 1, '/api/stats');
  assert.equal(body.stats[0].days_worked, 2);
});

test('?all=1 is all three people in their fixed order, and zeroes are zeroes', async () => {
  const e = await env();
  const p = await plan(e, 2);
  await call(e, 2, `/api/tasks/${firstTask(p).id}`, { method: 'PATCH', body: { status: 'done' } });

  const { body } = await call(e, 1, '/api/stats?all=1');
  assert.deepEqual(body.stats.map((s) => s.person_id), [1, 2, 3]);
  assert.deepEqual(body.stats.map((s) => s.days_worked), [0, 1, 0]);
  assert.deepEqual(body.stats.map((s) => s.tasks_done), [0, 1, 0]);
  assert.ok(body.stats.every((s) => typeof s.color === 'string'));
});

test('stats for nobody is a 400, not an empty list', async () => {
  const e = await env();
  const { res } = await call(e, null, '/api/stats');
  assert.equal(res.status, 400);
});
