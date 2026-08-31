// Setup, the draw and the reveal, end to end through the real Worker against a
// real SQLite engine holding the real seed.
//
// The draw engine has its own unit tests. What is asserted here is everything
// the engine cannot see on its own: that the sparse weight table is read with
// the right default, that recency reaches back through this person's own
// history and nobody else's, and that the three gates on the reveal are the
// gates DESIGN.md §6 describes.

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
const { drawInputs } = await import('../src/api/plans.js');
const {
  mondayOf, firstMondayOf, todayIn, monthOf, addMonths, startWeeksFor, startDateFor,
} = await import('../src/lib/dates.js');

const ADMIN_TOKEN = 'test-token';
const FAMILY_TZ = 'America/Chicago';

async function env() {
  const DB = new FakeD1();
  await applyPending(DB, MIGRATIONS);
  const e = { DB, ADMIN_TOKEN, FAMILY_PASSCODE: 'wanderlust', FAMILY_TZ };
  await runSeed(DB, SEEDS);
  return e;
}

async function as(e, personId) {
  return { cookie: (await issueSessionCookie(e, personId)).split(';')[0] };
}

async function call(e, personId, path, init = {}) {
  const headers = { ...(await as(e, personId)), ...(init.headers || {}) };
  if (init.body) headers['content-type'] = 'application/json';
  const res = await worker.fetch(new Request(`https://example.test${path}`, {
    ...init,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  }), e);
  return { res, body: await res.json() };
}

// September of a year far enough ahead that its first Monday is always later
// than this week's — which pins start_date to the first Monday of the month.
const futureSeptember = () => `${new Date().getUTCFullYear() + 2}-09`;

// A September already gone by, so this week's Monday wins instead.
const pastSeptember = () => `${new Date().getUTCFullYear() - 1}-09`;

const setup = (overrides = {}) => ({
  month: futureSeptember(),
  country_id: 1,
  focus_id: 1,
  project_type_id: 1,
  ...overrides,
});

const weekIds = (body, week) =>
  body.weeks.find((w) => w.week_no === week).tasks.map((t) => t.task_template_id);

// ------------------------------------------------------------------ create --

test('a plan is twenty tasks, five a week, and every one of them open', async () => {
  const e = await env();
  const { res, body } = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });

  assert.equal(res.status, 201);
  assert.equal(body.total, 20);
  assert.equal(body.done_count, 0);
  assert.equal(body.locked, false);
  for (const week of [1, 2, 3, 4]) assert.equal(weekIds(body, week).length, 5);
  assert.ok(body.weeks.every((w) => w.tasks.every((t) => t.status === 'open')));

  // The reveal screen is the prompt, not just the title, and it needs the
  // workbook page on every card. A payload missing either is a screen the kid
  // cannot use (§7).
  const first = body.weeks[0].tasks[0];
  assert.ok(first.title && first.prompt && first.workbook_page);
  assert.ok(body.plan.country_name && body.plan.focus_name && body.plan.project_type_name);
  // Materials come with it: picking a diorama on September 1st is exactly when a
  // parent needs to know they will want foam board.
  assert.ok('project_type_materials' in body.plan);
});

test('week 1 is the four core tasks and one drawn; week 4 is the sequence in order', async () => {
  const e = await env();
  const { body } = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });

  const week1 = body.weeks[0].tasks;
  assert.deepEqual(week1.slice(0, 4).map((t) => t.tier), ['core', 'core', 'core', 'core']);
  assert.equal(week1[4].tier, 'wild');
  assert.deepEqual(week1.map((t) => t.position), [1, 2, 3, 4, 5]);

  // Choose, gather, build, build, present. Out of order this is a kid rehearsing
  // a board they have not built.
  assert.deepEqual(
    body.weeks[3].tasks.map((t) => t.title),
    ['Plan your three panels', 'Gather your materials',
      'Build the left and center panels', 'Finish the right panel',
      'Rehearse and present your board'],
  );
});

test('start_date is always a Monday, and never earlier than this week', async () => {
  const e = await env();

  const ahead = futureSeptember();
  const { body: future } = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month: ahead }) });
  assert.equal(future.plan.start_date, firstMondayOf(ahead));
  assert.equal(mondayOf(future.plan.start_date), future.plan.start_date);

  // A month already past: the month's first Monday loses to the Monday of the
  // week setup actually happens in. This is the September 20th case — the kid
  // lands in week 1 rather than being backdated into week 3 with ten tasks
  // already on the carry-forward strip.
  const behind = pastSeptember();
  const { body: late } = await call(e, 2, '/api/plans', { method: 'POST', body: setup({ month: behind }) });
  assert.equal(late.plan.start_date, mondayOf(todayIn(FAMILY_TZ)));
  assert.ok(late.plan.start_date > firstMondayOf(behind));
});

test('the start week can be moved off the default at setup', async () => {
  const e = await env();
  const ahead = futureSeptember();
  const today = todayIn(FAMILY_TZ);
  const weeks = startWeeksFor(ahead, today);

  // The window offers the week the month begins in, which is earlier than the
  // month's first Monday whenever the 1st is not itself a Monday. Starting
  // there is the whole point: a family away at the end of the month finishes
  // before they go.
  const early = weeks[0];
  assert.ok(early <= firstMondayOf(ahead));

  const { res, body } = await call(e, 1, '/api/plans', {
    method: 'POST', body: setup({ month: ahead, start_date: early }),
  });
  assert.equal(res.status, 201);
  assert.equal(body.plan.start_date, early);
  assert.deepEqual(body.start_weeks, weeks);
  // Nothing else moved: the twenty tasks are drawn the same way whatever week
  // they are anchored to.
  assert.equal(body.total, 20);
  assert.equal(body.current_week, 1);
});

test('a start date outside the window is refused by the route', async () => {
  const e = await env();
  const ahead = futureSeptember();
  const weeks = startWeeksFor(ahead, todayIn(FAMILY_TZ));

  // A week before the earliest, which for a month set up ahead of time is a
  // week that belongs to the month before it.
  const [y, m, d] = weeks[0].split('-').map(Number);
  const tooEarly = new Date(Date.UTC(y, m - 1, d - 7)).toISOString().slice(0, 10);

  const { res, body } = await call(e, 1, '/api/plans', {
    method: 'POST', body: setup({ month: ahead, start_date: tooEarly }),
  });
  assert.equal(res.status, 400);
  assert.match(body.error, /not a week this month can start in/);

  // A Tuesday inside the window's range is refused too — the anchor is a Monday
  // and nothing else.
  const tuesday = weeks[1].slice(0, 8) + String(Number(weeks[1].slice(8)) + 1).padStart(2, '0');
  const { res: second } = await call(e, 1, '/api/plans', {
    method: 'POST', body: setup({ month: ahead, start_date: tuesday }),
  });
  assert.equal(second.status, 400);

  // And the plan that failed to draw did not leave a row behind.
  const { body: after } = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month: ahead }) });
  assert.equal(after.plan.start_date, startDateFor(ahead, todayIn(FAMILY_TZ)));
});

test('the start week moves after the first check-off, and the week follows it', async () => {
  const e = await env();
  const ahead = futureSeptember();
  const weeks = startWeeksFor(ahead, todayIn(FAMILY_TZ));
  const { body: created } = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month: ahead }) });
  const id = created.plan.id;

  // Check one off. The focus is closed from here and the start week is not
  // (Q-22): moving it destroys nothing, because tasks carry no dates.
  const first = created.weeks[0].tasks[0];
  const { body: done } = await call(e, 1, `/api/tasks/${first.id}`, {
    method: 'PATCH', body: { status: 'done' },
  });
  assert.equal(done.locked, true);

  const { res, body } = await call(e, 1, `/api/plans/${id}`, {
    method: 'PATCH', body: { start_date: weeks[0] },
  });
  assert.equal(res.status, 200);
  assert.equal(body.plan.start_date, weeks[0]);
  assert.equal(body.done_count, 1);
  assert.equal(body.total, 20);

  const { res: bad, body: badBody } = await call(e, 1, `/api/plans/${id}`, {
    method: 'PATCH', body: { start_date: '2000-01-03' },
  });
  assert.equal(bad.status, 400);
  assert.match(badBody.error, /not a week this month can start in/);
  // The refusal wrote nothing.
  const { body: still } = await call(e, 1, `/api/plans/${id}`);
  assert.equal(still.plan.start_date, weeks[0]);
});

test('a stamped month will not move its start week', async () => {
  const e = await env();
  const ahead = futureSeptember();
  const weeks = startWeeksFor(ahead, todayIn(FAMILY_TZ));
  const { body: created } = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month: ahead }) });
  const id = created.plan.id;

  for (const task of created.weeks.flatMap((w) => w.tasks)) {
    await call(e, 1, `/api/tasks/${task.id}`, { method: 'PATCH', body: { status: 'done' } });
  }
  await call(e, 1, `/api/plans/${id}/complete`, { method: 'POST' });

  const { res, body } = await call(e, 1, `/api/plans/${id}`, {
    method: 'PATCH', body: { start_date: weeks[0] },
  });
  assert.equal(res.status, 409);
  assert.match(body.error, /stamped/);
});

test('setting up a month that already has a plan opens that plan', async () => {
  const e = await env();
  const { body: first } = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });

  const { res, body } = await call(e, 1, '/api/plans', {
    method: 'POST',
    body: setup({ country_id: 9, focus_id: 3 }),
  });

  // A route, not an error screen: two devices, or a double-tap on a slow
  // connection.
  assert.equal(res.status, 409);
  assert.equal(body.plan_id, first.plan.id);

  // And it changed nothing about the plan that was already there.
  const { body: still } = await call(e, 1, `/api/plans/${first.plan.id}`);
  assert.equal(still.plan.country_id, first.plan.country_id);
  assert.equal(still.plan.focus_id, first.plan.focus_id);
});

test('the same person can hold one plan a month, and different people can share one', async () => {
  const e = await env();
  const month = futureSeptember();
  const a = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month }) });
  const b = await call(e, 2, '/api/plans', { method: 'POST', body: setup({ month }) });
  assert.equal(a.res.status, 201);
  assert.equal(b.res.status, 201);

  const next = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month: addMonths(month, 1) }) });
  assert.equal(next.res.status, 201);
});

test('setup refuses a month outside September to May, and a nonsense one', async () => {
  const e = await env();
  const summer = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month: `${new Date().getUTCFullYear() + 2}-07` }) });
  assert.equal(summer.res.status, 400);
  assert.match(summer.body.error, /September through May/);

  const nonsense = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month: 'later' }) });
  assert.equal(nonsense.res.status, 400);
});

test('a project type with no week 4 is refused rather than ending the month in blanks', async () => {
  const e = await env();
  // All six seeded project types carry a five-task sequence, so the empty one
  // has to be made: a project type created in the library editor has no week 4
  // until someone writes it. Setup hides it, and the server refuses it.
  e.DB.db.exec(
    "INSERT INTO project_types (slug, name, materials, origin) " +
    "VALUES ('shadow-box', 'Shadow box', 'A box, and things to put in it', 'custom')"
  );
  const empty = e.DB.prepare("SELECT id FROM project_types WHERE slug = 'shadow-box'").first().id;

  const { res, body } = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ project_type_id: empty }) });
  assert.equal(res.status, 409);
  assert.match(body.error, /no week 4/);

  // And it left no half-made plan holding the UNIQUE row.
  const retry = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });
  assert.equal(retry.res.status, 201);
});

test('a plan needs a person, a real country, a real focus', async () => {
  const e = await env();
  const nobody = await call(e, null, '/api/plans', { method: 'POST', body: setup() });
  assert.equal(nobody.res.status, 400);

  for (const bad of [{ country_id: 9999 }, { focus_id: 9999 }, { project_type_id: 9999 }]) {
    const { res } = await call(e, 1, '/api/plans', { method: 'POST', body: setup(bad) });
    assert.equal(res.status, 400);
  }
});

// -------------------------------------------------------------------- draw --

test('two people, same country, different focuses, different weeks 2 and 3', async () => {
  const e = await env();
  const month = futureSeptember();

  // Ten pairs rather than one: five of thirteen is drawn either way and two
  // focuses can coincide by luck. Asserting on a single pair is a test that
  // fails in CI one run in some hundreds.
  let differed = 0;
  for (let n = 0; n < 10; n += 1) {
    const e2 = await env();
    const a = await call(e2, 1, '/api/plans', { method: 'POST', body: setup({ month, focus_id: 1 }) });
    const b = await call(e2, 2, '/api/plans', { method: 'POST', body: setup({ month, focus_id: 2 }) });
    const same = [2, 3].every((w) =>
      JSON.stringify(weekIds(a.body, w).sort()) === JSON.stringify(weekIds(b.body, w).sort()));
    if (!same) differed += 1;
  }
  assert.equal(differed, 10);
  assert.ok(month);
});

test('the same person drawing the same focus two months running gets a different set', async () => {
  const e = await env();
  const first = futureSeptember();
  const second = addMonths(first, 1);

  const a = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month: first }) });
  const b = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month: second }) });

  // Recency halves the weight of everything drawn last month. Five of thirteen
  // is drawn, so overlap is expected — the assertion is that it is not total.
  for (const week of [2, 3]) {
    const overlap = weekIds(b.body, week).filter((id) => weekIds(a.body, week).includes(id));
    assert.ok(overlap.length < 5, `week ${week} repeated all five`);
  }
});

test('one person’s history does not weigh on another’s draw', async () => {
  const e = await env();
  const month = futureSeptember();
  await call(e, 1, '/api/plans', { method: 'POST', body: setup({ month: addMonths(month, -1) }) });

  // Person 2 has drawn nothing ever, so every template scores 1.0 for them. What
  // is under test is that the history query is scoped by person_id: if it were
  // not, person 1's September would be pushing person 2's October around.
  const { body } = await call(e, 2, '/api/plans', { method: 'POST', body: setup({ month }) });
  assert.equal(body.total, 20);
});

test('a focus favours without excluding: every prompt stays reachable', async () => {
  // There is no weight-0 any more. `fw = 1 + 2 * SUM` floors at 1, so a focus
  // says what it is about and never what the library may not offer — which is
  // the property that lets the merged pool draw eight from 50 at all.
  const e = await env();
  const { results: pool } = await e.DB.prepare(
    "SELECT id FROM task_templates WHERE week_theme IN (2, 3) AND tier != 'fixed'"
  ).all();

  for (const focus of [1, 5, 9]) {
    const inputs = await drawInputs(e, { personId: 1, month: '2099-01', focusId: focus });
    for (const template of pool) {
      assert.ok(inputs.focusWeight(template.id) >= 1,
        `focus ${focus} scored template ${template.id} below the baseline`);
    }
  }

  // And it does favour: the heaviest prompt is several times the baseline, or
  // picking a focus changes nothing that a kid could see.
  const inputs = await drawInputs(e, { personId: 1, month: '2099-01', focusId: 1 });
  const weights = pool.map((t) => inputs.focusWeight(t.id));
  assert.ok(Math.max(...weights) >= 7, `heaviest prompt is only ${Math.max(...weights)}`);
});

// ------------------------------------------------------------------ reveal --

test('redraw re-rolls the month, and is unlimited until the first check-off', async () => {
  const e = await env();
  const { body: made } = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });

  // Eight in a row, because unlimited is the specced behavior and one press
  // would not tell them apart. What varies is weeks 2 and 3: week 1's four core
  // tasks are fixed and week 4 is a sequence, so a redraw that changed those
  // would be the bug.
  const week2 = new Set([JSON.stringify(weekIds(made, 2).sort())]);
  for (let n = 0; n < 8; n += 1) {
    const { res, body } = await call(e, 1, `/api/plans/${made.plan.id}/redraw`, { method: 'POST' });
    assert.equal(res.status, 200);
    assert.equal(body.total, 20);
    assert.deepEqual(weekIds(body, 1).slice(0, 4), weekIds(made, 1).slice(0, 4));
    assert.deepEqual(weekIds(body, 4), weekIds(made, 4));

    // Country, focus and project type are untouched: redraw re-rolls the same
    // weighting, which is exactly why it is not the only lever on the screen.
    assert.equal(body.plan.country_id, made.plan.country_id);
    assert.equal(body.plan.focus_id, made.plan.focus_id);

    week2.add(JSON.stringify(weekIds(body, 2).sort()));
  }
  assert.ok(week2.size > 1, 'eight redraws produced the same week 2 every time');
});

test('redraw does not punish what it just drew', async () => {
  const e = await env();
  const { body: made } = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });
  // The plan being redrawn is in the month being drawn for, so counting it as
  // history would score everything at zero and leave the draw with nothing
  // eligible. Ten redraws in a row is the assertion that it does not.
  for (let n = 0; n < 10; n += 1) {
    const { res, body } = await call(e, 1, `/api/plans/${made.plan.id}/redraw`, { method: 'POST' });
    assert.equal(res.status, 200);
    assert.equal(body.total, 20);
  }
});

async function checkOff(e, planId, week) {
  const row = await e.DB.prepare(
    'SELECT id FROM plan_tasks WHERE plan_id = ? AND week_no = ? ORDER BY position LIMIT 1'
  ).bind(planId, week).first();
  await e.DB.prepare(
    "UPDATE plan_tasks SET status = 'done', completed_at = '2026-09-08T00:00:00Z' WHERE id = ?"
  ).bind(row.id).run();
}

test('the first check-off closes redraw and closes the focus', async () => {
  const e = await env();
  const { body: made } = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });
  await checkOff(e, made.plan.id, 1);

  const redraw = await call(e, 1, `/api/plans/${made.plan.id}/redraw`, { method: 'POST' });
  assert.equal(redraw.res.status, 409);

  const focus = await call(e, 1, `/api/plans/${made.plan.id}`, { method: 'PATCH', body: { focus_id: 4 } });
  assert.equal(focus.res.status, 409);

  // Country is free even here: tasks are country-agnostic, which is what lets a
  // kid change countries at any point in the month.
  const country = await call(e, 1, `/api/plans/${made.plan.id}`, { method: 'PATCH', body: { country_id: 42 } });
  assert.equal(country.res.status, 200);
  assert.equal(country.body.plan.country_id, 42);
});

test('changing focus before any check-off redraws weeks 2 and 3 and leaves 1 and 4 alone', async () => {
  const e = await env();
  const { body: made } = await call(e, 1, '/api/plans', { method: 'POST', body: setup({ focus_id: 1 }) });

  const { res, body } = await call(e, 1, `/api/plans/${made.plan.id}`, {
    method: 'PATCH', body: { focus_id: 5 },
  });

  assert.equal(res.status, 200);
  assert.equal(body.plan.focus_id, 5);
  assert.equal(body.total, 20);
  assert.deepEqual(weekIds(body, 1), weekIds(made.body ?? made, 1));
  assert.deepEqual(weekIds(body, 4), weekIds(made, 4));
});

test('changing project type rewrites week 4, and is refused once week 4 has started', async () => {
  const e = await env();
  // Give a second project type a week-4 sequence, the way slice 09 will.
  await e.DB.prepare(`
    INSERT INTO task_templates (slug, title, prompt, week_theme, workbook_page, tier, project_type_id, position, origin)
    SELECT 'diorama-' || position, title, prompt, 4, 'project', 'core', 2, position, 'custom'
    FROM task_templates WHERE week_theme = 4 AND project_type_id = 1
  `).run();

  const { body: made } = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });
  const before = weekIds(made, 4);

  const moved = await call(e, 1, `/api/plans/${made.plan.id}`, {
    method: 'PATCH', body: { project_type_id: 2 },
  });
  assert.equal(moved.res.status, 200);
  assert.equal(moved.body.plan.project_type_id, 2);
  assert.equal(weekIds(moved.body, 4).filter((id) => before.includes(id)).length, 0);
  // Weeks 1 to 3 are untouched: week 4 is the only part of the plan the project
  // type reaches.
  assert.deepEqual(weekIds(moved.body, 1), weekIds(made, 1));

  await checkOff(e, made.plan.id, 4);
  const late = await call(e, 1, `/api/plans/${made.plan.id}`, {
    method: 'PATCH', body: { project_type_id: 1 },
  });
  assert.equal(late.res.status, 409);
});

test('a check-off outside week 4 does not close the project type', async () => {
  const e = await env();
  await e.DB.prepare(`
    INSERT INTO task_templates (slug, title, prompt, week_theme, workbook_page, tier, project_type_id, position, origin)
    SELECT 'zine-' || position, title, prompt, 4, 'project', 'core', 6, position, 'custom'
    FROM task_templates WHERE week_theme = 4 AND project_type_id = 1
  `).run();

  const { body: made } = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });
  await checkOff(e, made.plan.id, 1);

  // Project type is not used until week 4, so it can change until then — a
  // different gate from the focus, which shaped the draw.
  const { res } = await call(e, 1, `/api/plans/${made.plan.id}`, {
    method: 'PATCH', body: { project_type_id: 6 },
  });
  assert.equal(res.status, 200);
});

test('a plan is readable by the family and rerollable only by its owner', async () => {
  const e = await env();
  const { body: made } = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });

  // The passport is shared and so is the wall: seeing someone's month is the
  // point of the family screens.
  const read = await call(e, 2, `/api/plans/${made.plan.id}`);
  assert.equal(read.res.status, 200);

  // Rerolling it is not. There are no roles in this app; this is the one place
  // that costs something, and it costs a sibling on a shared phone.
  const redraw = await call(e, 2, `/api/plans/${made.plan.id}/redraw`, { method: 'POST' });
  assert.equal(redraw.res.status, 403);
  const patch = await call(e, 2, `/api/plans/${made.plan.id}`, { method: 'PATCH', body: { focus_id: 3 } });
  assert.equal(patch.res.status, 403);
});

test('a plan that does not exist is 404, not a blank screen', async () => {
  const e = await env();
  assert.equal((await call(e, 1, '/api/plans/999')).res.status, 404);
  assert.equal((await call(e, 1, '/api/plans/999/redraw', { method: 'POST' })).res.status, 404);
});

// ------------------------------------------------------- setup’s two feeds --

test('a focus previews its three heaviest titles, across both natural halves', async () => {
  const e = await env();
  const { res, body } = await call(e, 1, '/api/focuses/2/samples');

  assert.equal(res.status, 200);
  assert.equal(body.samples.length, 3);
  assert.ok(body.focus.name);

  // Across weeks 2 and 3 rather than three from whichever half this focus
  // leans to: a preview that shows half the month is half the consequence.
  assert.ok(new Set(body.samples.map((s) => s.week_theme)).size > 1);

  // Every title is one this focus actually lifts, and the heaviest of its half.
  const { results: lifted } = await e.DB.prepare(`
    SELECT t.id, t.week_theme, 1 + 2 * SUM(ft.weight) AS fw
    FROM prompt_tags p
    JOIN focus_tags ft ON ft.tag = p.tag AND ft.focus_id = 2
    JOIN task_templates t ON t.id = p.task_template_id
    WHERE p.namespace = 'topic' AND t.week_theme IN (2, 3) AND t.tier != 'fixed'
    GROUP BY t.id
  `).all();
  const byId = new Map(lifted.map((r) => [r.id, r]));

  for (const sample of body.samples) {
    const row = byId.get(sample.id);
    assert.ok(row, `${sample.id} is not a prompt this focus reaches`);
    const rivals = lifted.filter((r) => r.week_theme === row.week_theme);
    assert.equal(row.fw, Math.max(...rivals.map((r) => r.fw)),
      'a sample is not the heaviest of its half');
  }
  assert.ok(body.above_baseline > 0);
});

test('every seeded focus has something to preview', async () => {
  const e = await env();
  const { results } = await e.DB.prepare('SELECT id FROM focuses WHERE archived = 0').all();
  for (const focus of results) {
    const { body } = await call(e, 1, `/api/focuses/${focus.id}/samples`);
    assert.equal(body.samples.length, 3, `focus ${focus.id} previewed ${body.samples.length}`);
  }
  assert.equal((await call(e, 1, '/api/focuses/999/samples')).res.status, 404);
});

test('the passport carries the year, the stamps and the months that are running', async () => {
  const e = await env();
  const { body: made } = await call(e, 1, '/api/plans', { method: 'POST', body: setup() });

  const { res, body } = await call(e, 1, '/api/passport');
  assert.equal(res.status, 200);
  assert.equal(body.months.length, 9);
  assert.equal(body.months[0].slice(5), '09');
  assert.equal(body.months[8].slice(5), '05');
  assert.equal(body.people.length, 3);
  assert.deepEqual(body.stamps, []);

  // An in-progress month is the one piece of live state the family screen can
  // carry before anybody has finished anything.
  assert.equal(body.plans.length, 1);
  assert.equal(body.plans[0].country_name, made.plan.country_name);

  // What setup reads it for (Q-07): which countries are already stamped, and in
  // whose ink.
  await e.DB.prepare(`
    INSERT INTO stamps (plan_id, person_id, country_id, focus_id, earned_at)
    VALUES (?, ?, ?, ?, '2026-09-30T00:00:00Z')
  `).bind(made.plan.id, 1, made.plan.country_id, made.plan.focus_id).run();

  const { body: after } = await call(e, 1, '/api/passport');
  assert.equal(after.stamps.length, 1);
  assert.equal(after.stamps[0].person_id, 1);
  assert.equal(after.stamps[0].country_id, made.plan.country_id);
  assert.ok(after.stamps[0].country_name && after.stamps[0].focus_name);
});

test('/api/me carries the family’s own today and the month setup would open', async () => {
  const e = await env();
  const { body } = await call(e, 1, '/api/me');
  assert.equal(body.today, todayIn(FAMILY_TZ));
  // Inside the year it is this month; over the summer it is the September ahead.
  const month = monthOf(body.today);
  const summer = ['06', '07', '08'].includes(month.slice(5));
  assert.equal(body.month, summer ? `${month.slice(0, 4)}-09` : month);

  // And the Mondays that month may start on, because setup has no plan to read
  // them off yet and must not work them out from the device's clock.
  assert.deepEqual(body.start_weeks, startWeeksFor(body.month, body.today));
  assert.ok(body.start_weeks.includes(startDateFor(body.month, body.today)));
});

test('every route this slice adds is behind the passcode', async () => {
  const e = await env();
  for (const [method, path] of [
    ['POST', '/api/plans'],
    ['GET', '/api/plans/1'],
    ['PATCH', '/api/plans/1'],
    ['POST', '/api/plans/1/redraw'],
    ['GET', '/api/focuses/1/samples'],
    ['GET', '/api/passport'],
  ]) {
    const res = await worker.fetch(new Request(`https://example.test${path}`, { method }), e);
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test('the shell answers on /setup and /plan/:id, and 404s on a typo', async () => {
  const e = { ...(await env()), ASSETS: { fetch: () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }) } };
  for (const path of ['/setup', '/plan/12']) {
    const res = await worker.fetch(new Request(`https://example.test${path}`), e);
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get('content-type'), /html/);
  }
  // A mistyped fetch has to fail as a fetch rather than come back as HTML.
  assert.equal((await worker.fetch(new Request('https://example.test/plan/twelve'), e)).status, 404);
  assert.equal((await worker.fetch(new Request('https://example.test/plans/12'), e)).status, 404);
});
