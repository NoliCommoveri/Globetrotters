// The library editor's writes (DESIGN.md §12, slice 08).
//
// The two rules that hold everywhere here are the ones worth a test each:
// nothing is ever deleted, and edits propagate live into months already drawn.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FakeD1 } from './d1.js';
import { applyPending } from '../src/lib/migrations.js';
import { runSeed } from '../src/lib/seed.js';
import { apiLibrary } from '../src/admin/library-api.js';
import { apiCreateTask, apiPatchTask } from '../src/admin/tasks.js';
import { apiCreateFocus, apiPatchFocus, apiPutFocusWeights, POOL_FLOOR, thin } from '../src/admin/focuses.js';
import { apiCreateProjectType, apiPatchProjectType } from '../src/admin/project-types.js';
import { apiCountry, apiCreateHook, apiPatchHook, apiDeleteHook, apiPutAffinities }
  from '../src/admin/countries.js';
import { apiCreatePlan, apiGetPlan } from '../src/api/plans.js';

const read = (name) => readFileSync(new URL(`../src/migrations/${name}`, import.meta.url), 'utf8');
const MIGRATIONS = [{ id: '001', name: '001_schema.sql', sql: read('001_schema.sql') }];
const SEEDS = [{ id: '002', name: '002_seed.sql', sql: read('002_seed.sql') }];

async function env() {
  const DB = new FakeD1();
  await applyPending(DB, MIGRATIONS);
  await runSeed(DB, SEEDS);
  return { DB, FAMILY_TZ: 'UTC' };
}

const req = (method, body) => new Request('https://example.test/admin/api', {
  method,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const body = async (res) => res.json();

const idOf = (e, sql) => e.DB.prepare(sql).first();

// The plan payload groups its twenty by week; every assertion here wants them
// flat.
const allTasks = (payload) => payload.weeks.flatMap((w) => w.tasks);

// A month for one person, so the propagation and archive tests have real
// plan_tasks to look at.
async function plan(e) {
  const country = idOf(e, "SELECT id FROM countries WHERE iso3 = 'JPN'");
  const focus = idOf(e, "SELECT id FROM focuses WHERE slug = 'wild-places'");
  const project = idOf(e, "SELECT id FROM project_types WHERE slug = 'trifold-board'");
  const res = await apiCreatePlan(
    new Request('https://example.test/api/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        month: '2026-09', country_id: country.id, focus_id: focus.id, project_type_id: project.id,
      }),
    }),
    e,
    { personId: 1 }
  );
  assert.equal(res.status, 201, await res.clone().text());
  return res.json();
}

test('the read route carries every template, its weights and its draw counts', async () => {
  const e = await env();
  const p = await plan(e);
  const data = await body(await apiLibrary(req('GET'), e));

  assert.equal(data.tasks.length, 90);
  assert.equal(data.focuses.length, 6);
  assert.equal(data.project_types.length, 6);
  assert.equal(data.countries.length, 195);
  assert.ok(data.weights.length > 0);

  // Twenty tasks were drawn for one person, so twenty draw rows all naming them.
  const drawn = data.draws.reduce((n, d) => n + d.n, 0);
  assert.equal(drawn, 20);
  assert.ok(data.draws.every((d) => d.person_id === 1));
  assert.equal(allTasks(p).length, 20);
});

test('fixing a typo in a prompt changes it inside an active month', async () => {
  const e = await env();
  const p = await plan(e);
  const first = allTasks(p)[0];

  const res = await apiPatchTask(req('PATCH', { prompt: 'Corrected instruction.' }), e,
    { id: String(first.task_template_id) });
  assert.equal(res.status, 200);

  const after = await (await apiGetPlan(new Request('https://example.test/api/plans/1'), e,
    { personId: 1 }, { id: String(p.plan.id) })).json();
  const same = allTasks(after).find((t) => t.task_template_id === first.task_template_id);
  assert.equal(same.prompt, 'Corrected instruction.');
});

test('archiving a template leaves the month it is already in alone', async () => {
  const e = await env();
  const p = await plan(e);
  const drawn = allTasks(p).find((t) => t.week_no === 2);

  await apiPatchTask(req('PATCH', { archived: 1 }), e, { id: String(drawn.task_template_id) });

  const after = await (await apiGetPlan(new Request('https://example.test/api/plans/1'), e,
    { personId: 1 }, { id: String(p.plan.id) })).json();
  assert.equal(allTasks(after).length, 20);
  assert.ok(allTasks(after).some((t) => t.task_template_id === drawn.task_template_id));

  // And the row is still there: archived is a flag, not a delete.
  const row = idOf(e, `SELECT archived FROM task_templates WHERE id = ${drawn.task_template_id}`);
  assert.equal(row.archived, 1);
});

test('an archived template is out of the next draw', async () => {
  const e = await env();
  // Archive every week 2 template the focus can draw but five, and the next
  // draw must be exactly the five left. The focus's own weight-0 rows are
  // excluded from the keep set: a task at 0 is not a candidate either way, and
  // this test is about archived, not about weights.
  const { results } = e.DB.prepare(`
    SELECT task_templates.id FROM task_templates
    LEFT JOIN task_focus_weights
      ON task_focus_weights.task_template_id = task_templates.id
     AND task_focus_weights.focus_id = (SELECT id FROM focuses WHERE slug = 'wild-places')
    WHERE task_templates.week_theme = 2 AND COALESCE(task_focus_weights.weight, 1) > 0
    ORDER BY task_templates.id
  `).all();
  const keep = results.slice(0, 5).map((r) => r.id);
  for (const row of results.slice(5)) {
    await apiPatchTask(req('PATCH', { archived: 1 }), e, { id: String(row.id) });
  }

  const p = await plan(e);
  const week2 = allTasks(p).filter((t) => t.week_no === 2)
    .map((t) => t.task_template_id).sort();
  assert.deepEqual(week2, keep.slice().sort());
});

test('a new task is custom, gets a slug of its own, and validates its week', async () => {
  const e = await env();
  const res = await apiCreateTask(req('POST', {
    title: "What's for breakfast?",
    prompt: 'Find out what a kid there eats before school and draw it.',
    week_theme: 3,
    tier: 'focus',
    workbook_page: 'food',
  }), e);
  assert.equal(res.status, 201);
  const { task } = await res.json();
  assert.equal(task.origin, 'custom');
  assert.equal(task.slug, 'whats-for-breakfast');
  assert.equal(task.archived, 0);

  for (const bad of [
    { title: 'x', prompt: 'y', week_theme: 7, tier: 'focus' },
    { title: 'x', prompt: 'y', week_theme: 2, tier: 'legendary' },
    { title: '  ', prompt: 'y', week_theme: 2, tier: 'focus' },
    { prompt: 'y', week_theme: 2, tier: 'focus' },
    // Week 4 without a project type is a sequence nobody can draw.
    { title: 'x', prompt: 'y', week_theme: 4, tier: 'focus' },
    // And a project type on a week that is not 4 is a row the draw ignores.
    { title: 'x', prompt: 'y', week_theme: 2, tier: 'focus', project_type_id: 1 },
  ]) {
    assert.equal((await apiCreateTask(req('POST', bad), e)).status, 400, JSON.stringify(bad));
  }
});

test('two tasks with the same title get different slugs', async () => {
  const e = await env();
  const make = () => apiCreateTask(req('POST', {
    title: 'Draw the flag', prompt: 'Again.', week_theme: 2, tier: 'focus',
  }), e);
  const a = (await (await make()).json()).task;
  const b = (await (await make()).json()).task;
  assert.equal(a.slug, 'draw-the-flag');
  assert.equal(b.slug, 'draw-the-flag-2');
});

test('a missing task and an empty patch are told apart', async () => {
  const e = await env();
  assert.equal((await apiPatchTask(req('PATCH', { title: 'x' }), e, { id: '9999' })).status, 404);
  assert.equal((await apiPatchTask(req('PATCH', {}), e, { id: '1' })).status, 400);
});

test('moving a task off week 4 takes its project type with it', async () => {
  const e = await env();
  const row = idOf(e, 'SELECT id FROM task_templates WHERE week_theme = 4 ORDER BY id LIMIT 1');
  const { task } = await body(await apiPatchTask(req('PATCH', { week_theme: 3 }), e,
    { id: String(row.id) }));
  assert.equal(task.week_theme, 3);
  assert.equal(task.project_type_id, null);
});

test('the weight grid round-trips and a cell back at 1 stores no row', async () => {
  const e = await env();
  const focus = idOf(e, "SELECT id FROM focuses WHERE slug = 'wild-places'");
  const stored = idOf(e, `
    SELECT task_template_id FROM task_focus_weights WHERE focus_id = ${focus.id} AND weight = 3 LIMIT 1
  `);

  const res = await apiPutFocusWeights(req('PUT', {
    weights: [{ task_template_id: stored.task_template_id, weight: 1 }],
  }), e, { id: String(focus.id) });
  assert.equal(res.status, 200);

  const gone = idOf(e, `
    SELECT 1 AS hit FROM task_focus_weights
    WHERE focus_id = ${focus.id} AND task_template_id = ${stored.task_template_id}
  `);
  assert.equal(gone, null);

  // And back to 3 writes the row again.
  await apiPutFocusWeights(req('PUT', {
    weights: [{ task_template_id: stored.task_template_id, weight: 3 }],
  }), e, { id: String(focus.id) });
  const again = idOf(e, `
    SELECT weight FROM task_focus_weights
    WHERE focus_id = ${focus.id} AND task_template_id = ${stored.task_template_id}
  `);
  assert.equal(again.weight, 3);
});

test('the grid refuses a weight that is not off, 1 or 3', async () => {
  const e = await env();
  for (const weight of [2, 0.5, -1, 'three']) {
    const res = await apiPutFocusWeights(req('PUT', {
      weights: [{ task_template_id: 1, weight }],
    }), e, { id: '1' });
    assert.equal(res.status, 400, String(weight));
  }
  assert.equal((await apiPutFocusWeights(req('PUT', {}), e, { id: '1' })).status, 400);
  assert.equal(
    (await apiPutFocusWeights(req('PUT', { weights: [{ task_template_id: 9999, weight: 3 }] }), e,
      { id: '1' })).status,
    400
  );
});

test('a focus created with zero weight rows draws against the full pool', async () => {
  const e = await env();
  const res = await apiCreateFocus(req('POST', {
    name: 'Money and Trade', blurb: 'What things cost and who they come from.',
  }), e);
  assert.equal(res.status, 201);
  const { focus } = await res.json();
  assert.equal(focus.origin, 'custom');
  assert.equal(focus.slug, 'money-and-trade');

  const rows = e.DB.prepare(
    `SELECT COUNT(*) AS n FROM task_focus_weights WHERE focus_id = ${focus.id}`
  ).first();
  assert.equal(rows.n, 0);

  // The library carries 25 week-2 and 25 week-3 templates. Every one of them
  // sits at an effective weight of 1 for a focus with no rows, so a focus with
  // no opinions at all still draws a full month — it just draws the same month
  // as picking nothing.
  assert.deepEqual(focus.pool, { week2: 25, week3: 25 });
  assert.equal(focus.thin, false);

  // The warning is still live, and still measured per week: it fires on the
  // week that is short, not on the total.
  assert.equal(thin({ week2: POOL_FLOOR - 1, week3: 25 }), true);
  assert.equal(thin({ week2: 25, week3: 25 }), false);

  // The draw is the proof the warning is advice and not a gate.
  const country = idOf(e, "SELECT id FROM countries WHERE iso3 = 'PER'");
  const project = idOf(e, "SELECT id FROM project_types WHERE slug = 'trifold-board'");
  const drawn = await apiCreatePlan(new Request('https://example.test/api/plans', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      month: '2026-10', country_id: country.id, focus_id: focus.id, project_type_id: project.id,
    }),
  }), e, { personId: 2 });
  assert.equal(drawn.status, 201, await drawn.clone().text());
  assert.equal(allTasks(await drawn.json()).length, 20);
});

test('zeroing a focus down to four week-2 tasks is refused by the draw, not by the grid', async () => {
  const e = await env();
  const focus = idOf(e, "SELECT id FROM focuses WHERE slug = 'wild-places'");
  const { results } = e.DB.prepare(
    'SELECT id FROM task_templates WHERE week_theme = 2 ORDER BY id'
  ).all();

  // Every cell stated, so the pool is four whatever the seed already said.
  const res = await apiPutFocusWeights(req('PUT', {
    weights: results.map((r, i) => ({ task_template_id: r.id, weight: i < 4 ? 3 : 0 })),
  }), e, { id: String(focus.id) });
  assert.equal(res.status, 200);
  const saved = await res.json();
  assert.equal(saved.pool.week2, 4);
  assert.equal(saved.thin, true);

  const country = idOf(e, "SELECT id FROM countries WHERE iso3 = 'KEN'");
  const project = idOf(e, "SELECT id FROM project_types WHERE slug = 'trifold-board'");
  const drawn = await apiCreatePlan(new Request('https://example.test/api/plans', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      month: '2026-11', country_id: country.id, focus_id: focus.id, project_type_id: project.id,
    }),
  }), e, { personId: 3 });
  assert.equal(drawn.status, 409);
});

test('a focus is archived, never deleted', async () => {
  const e = await env();
  const res = await apiPatchFocus(req('PATCH', { archived: 1 }), e, { id: '1' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).focus.archived, 1);
  assert.ok(idOf(e, 'SELECT id FROM focuses WHERE id = 1'));

  assert.equal((await apiPatchFocus(req('PATCH', { name: '  ' }), e, { id: '1' })).status, 400);
  assert.equal((await apiPatchFocus(req('PATCH', { name: 'x' }), e, { id: '99' })).status, 404);
});

test('a project type reorders its own week 4 sequence and nobody else\'s', async () => {
  const e = await env();
  const project = idOf(e, "SELECT id FROM project_types WHERE slug = 'trifold-board'");
  const { results } = e.DB.prepare(
    `SELECT id FROM task_templates WHERE week_theme = 4 AND project_type_id = ${project.id}
     ORDER BY position, id`
  ).all();
  const reversed = results.map((r) => r.id).reverse();

  const res = await apiPatchProjectType(req('PATCH', { order: reversed }), e,
    { id: String(project.id) });
  assert.equal(res.status, 200);
  const { sequence } = await res.json();
  assert.deepEqual(sequence.map((s) => s.id), reversed);
  assert.deepEqual(sequence.map((s) => s.position), [1, 2, 3, 4, 5]);

  // A partial order, a duplicate, and an id belonging to another project type
  // are all refused rather than half-applied.
  for (const order of [reversed.slice(1), [reversed[0], reversed[0]], [999999]]) {
    assert.equal(
      (await apiPatchProjectType(req('PATCH', { order }), e, { id: String(project.id) })).status,
      400
    );
  }
});

test('a new project type starts with an empty week 4 and says so', async () => {
  const e = await env();
  const res = await apiCreateProjectType(req('POST', {
    name: 'Board game', materials: 'Card, dice, a lid to keep it in.',
  }), e);
  assert.equal(res.status, 201);
  const { project_type: made } = await res.json();
  assert.equal(made.week4_templates, 0);
  assert.equal(made.origin, 'custom');

  // Which is exactly the state /api/catalog hides from setup.
  const { results } = e.DB.prepare(
    `SELECT COUNT(*) AS n FROM task_templates WHERE project_type_id = ${made.id}`
  ).all();
  assert.equal(results[0].n, 0);
});

test('a hook is added, edited and — alone in the library — deleted', async () => {
  const e = await env();
  const japan = idOf(e, "SELECT id FROM countries WHERE iso3 = 'JPN'");

  const made = await apiCreateHook(req('POST', { text: 'Ask why the trains are on time.' }), e,
    { id: String(japan.id) });
  assert.equal(made.status, 201);
  const { hooks } = await made.json();
  assert.equal(hooks.length, 1);
  assert.equal(hooks[0].origin, 'custom');

  const edited = await body(await apiPatchHook(req('PATCH', { text: 'Ask about the trains.' }), e,
    { id: String(hooks[0].id) }));
  assert.equal(edited.hooks[0].text, 'Ask about the trains.');

  const dropped = await apiDeleteHook(req('DELETE'), e, { id: String(hooks[0].id) });
  assert.equal(dropped.status, 200);
  assert.deepEqual((await dropped.json()).hooks, []);
  assert.equal(idOf(e, `SELECT id FROM country_hooks WHERE id = ${hooks[0].id}`), null);
  assert.equal((await apiDeleteHook(req('DELETE'), e, { id: String(hooks[0].id) })).status, 404);
});

test('affinities save as a set, and off stores no row', async () => {
  const e = await env();
  const peru = idOf(e, "SELECT id FROM countries WHERE iso3 = 'PER'");
  const { results: focuses } = e.DB.prepare('SELECT id FROM focuses ORDER BY id').all();

  const saved = await body(await apiPutAffinities(req('PUT', {
    affinities: [
      { focus_id: focuses[0].id, score: 3, reason: 'Machu Picchu is the whole month.' },
      { focus_id: focuses[1].id, score: 2, reason: '' },
      { focus_id: focuses[2].id, score: 0 },
    ],
  }), e, { id: String(peru.id) }));

  assert.equal(saved.affinities.length, 2);
  assert.equal(saved.affinities[0].score, 3);
  assert.equal(saved.affinities[1].reason, null);

  // Turning one off removes it; the other is untouched.
  const after = await body(await apiPutAffinities(req('PUT', {
    affinities: [{ focus_id: focuses[0].id, score: 0 }],
  }), e, { id: String(peru.id) }));
  assert.deepEqual(after.affinities.map((a) => a.focus_id), [focuses[1].id]);

  for (const bad of [
    { affinities: [{ focus_id: focuses[0].id, score: 1 }] },
    { affinities: [{ focus_id: 9999, score: 3 }] },
    { affinities: [{ focus_id: focuses[0].id, score: 3, reason: 'x'.repeat(200) }] },
    {},
  ]) {
    assert.equal((await apiPutAffinities(req('PUT', bad), e, { id: String(peru.id) })).status, 400);
  }
});

test('one country reads back its own hooks and fits', async () => {
  const e = await env();
  const chad = idOf(e, "SELECT id FROM countries WHERE iso3 = 'TCD'");
  await apiCreateHook(req('POST', { text: 'The lake that keeps shrinking.' }), e,
    { id: String(chad.id) });

  const data = await body(await apiCountry(req('GET'), e, { id: String(chad.id) }));
  assert.equal(data.country.iso3, 'TCD');
  assert.equal(data.hooks.length, 1);
  assert.equal((await apiCountry(req('GET'), e, { id: '99999' })).status, 404);
});
