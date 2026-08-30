// Export and import (DESIGN.md §12, slice 08).
//
// This is the backup, and it is the only way a tuned library crosses into next
// school year without a terminal. There is no preview database to restore into
// (§2), so the round trip is proven in place: export, import the same file back
// into the same database, and nothing may move.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FakeD1 } from './d1.js';
import { applyPending } from '../src/lib/migrations.js';
import { runSeed } from '../src/lib/seed.js';
import { libraryExport, libraryImport, apiLibraryExport, apiLibraryImport }
  from '../src/admin/library-api.js';
import { apiPatchTask, apiCreateTask } from '../src/admin/tasks.js';
import { apiCreateFocus, apiPutFocusTags } from '../src/admin/focuses.js';
import { apiCreateHook, apiPutAffinities } from '../src/admin/countries.js';

const read = (name) => readFileSync(new URL(`../src/migrations/${name}`, import.meta.url), 'utf8');
const MIGRATIONS = [
  { id: '001', name: '001_schema.sql', sql: read('001_schema.sql') },
  { id: '004', name: '004_worksheets.sql', sql: read('004_worksheets.sql') },
];
const SEEDS = [{ id: '002', name: '002_seed.sql', sql: read('002_seed.sql') }];

async function env() {
  const DB = new FakeD1();
  await applyPending(DB, MIGRATIONS);
  await runSeed(DB, SEEDS);
  return { DB };
}

const req = (method, body) => new Request('https://example.test/admin/api/library.json', {
  method,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const zero = (counts) =>
  Object.values(counts).every((c) => c.inserted === 0 && c.updated === 0);

// Everything a snapshot has to agree on. Ids are deliberately absent: the file
// is keyed on slugs, and a restore into a fresh database will not reuse this
// one's numbering.
function snapshot(db) {
  const rows = (sql) => db.prepare(sql).all().results;
  return {
    focuses: rows('SELECT slug, name, blurb, archived, origin FROM focuses ORDER BY slug'),
    projects: rows('SELECT slug, name, materials, archived, origin FROM project_types ORDER BY slug'),
    tasks: rows(`
      SELECT t.slug, t.title, t.prompt, t.week_theme, t.workbook_page, t.tier,
             p.slug AS project_type, t.position, t.archived, t.origin
      FROM task_templates t LEFT JOIN project_types p ON p.id = t.project_type_id
      ORDER BY t.slug
    `),
    focus_tags: rows(`
      SELECT f.slug AS focus, ft.tag, ft.weight
      FROM focus_tags ft JOIN focuses f ON f.id = ft.focus_id
      ORDER BY f.slug, ft.tag
    `),
    prompt_tags: rows(`
      SELECT t.slug AS task, p.namespace, p.tag
      FROM prompt_tags p JOIN task_templates t ON t.id = p.task_template_id
      ORDER BY t.slug, p.namespace, p.tag
    `),
    hooks: rows(`
      SELECT c.iso3, h.text, h.position FROM country_hooks h
      JOIN countries c ON c.id = h.country_id ORDER BY c.iso3, h.text
    `),
    affinities: rows(`
      SELECT c.iso3, f.slug, a.score, a.reason FROM country_focus_affinity a
      JOIN countries c ON c.id = a.country_id JOIN focuses f ON f.id = a.focus_id
      ORDER BY c.iso3, f.slug
    `),
  };
}

// A library that has actually been tuned: an edited seed row, a custom task, a
// new focus with a tag set of its own, a hook and a set of fits. An export of
// the untouched seed would round-trip a file with almost nothing in it.
async function tuned(e) {
  await apiPatchTask(new Request('https://example.test/x', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'Corrected, by hand, in the editor.' }),
  }), e, { id: '1' });

  const post = (handler, body, params) => handler(new Request('https://example.test/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), e, params);

  await post(apiCreateTask, {
    title: 'Count the coins', prompt: 'Find what the money looks like and draw one coin.',
    week_theme: 2, tier: 'wild', workbook_page: 'money',
  });
  const { focus } = await (await post(apiCreateFocus, {
    name: 'Money and Trade', blurb: 'What things cost and who they come from.',
  })).json();

  await apiPutFocusTags(new Request('https://example.test/x', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      tags: [{ tag: 'trade', weight: 3 }, { tag: 'work-and-money', weight: 3 },
             { tag: 'public-money', weight: 2 }, { tag: 'who-owns-it', weight: 1 }],
    }),
  }), e, { id: String(focus.id) });

  const japan = e.DB.prepare("SELECT id FROM countries WHERE iso3 = 'JPN'").first();
  await post(apiCreateHook, { text: 'Ask why the trains are on time.' }, { id: String(japan.id) });
  await apiPutAffinities(new Request('https://example.test/x', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ affinities: [{ focus_id: focus.id, score: 3, reason: 'Yen everywhere.' }] }),
  }), e, { id: String(japan.id) });
}

test('the export carries every library table, keyed by slug and ISO3', async () => {
  const e = await env();
  await tuned(e);
  const file = await libraryExport(e.DB);

  assert.equal(file.version, 2);
  assert.equal(file.focuses.length, 10);
  assert.equal(file.project_types.length, 6);
  assert.equal(file.tasks.length, 198);
  assert.ok(file.focus_tags.length >= 65);
  assert.ok(file.prompt_tags.length >= 330);
  assert.equal(file.hooks.length, 1);
  assert.equal(file.affinities.length, 1);

  // Not an id anywhere in it.
  assert.ok(file.tasks.every((t) => t.id === undefined));
  assert.equal(file.hooks[0].country, 'JPN');
  assert.equal(file.affinities[0].country, 'JPN');
  assert.equal(typeof file.prompt_tags[0].task, 'string');
  assert.equal(typeof file.focus_tags[0].focus, 'string');
});

test('importing the export back changes nothing, twice over', async () => {
  const e = await env();
  await tuned(e);

  const before = snapshot(e.DB);
  const file = await libraryExport(e.DB);

  const first = await libraryImport(e.DB, file);
  assert.ok(zero(first), JSON.stringify(first));
  assert.deepEqual(snapshot(e.DB), before);

  const second = await libraryImport(e.DB, file);
  assert.ok(zero(second), JSON.stringify(second));
  assert.deepEqual(snapshot(e.DB), before);
});

test('an import into an empty library restores all of it', async () => {
  const source = await env();
  await tuned(source);
  const file = await libraryExport(source.DB);
  const before = snapshot(source.DB);

  // A fresh database with the schema and countries but no library: the shape a
  // restore actually lands in.
  const target = await env();
  target.DB.db.exec('DELETE FROM prompt_tags');
  target.DB.db.exec('DELETE FROM focus_tags');
  target.DB.db.exec('DELETE FROM country_focus_affinity');
  target.DB.db.exec('DELETE FROM country_hooks');
  target.DB.db.exec('DELETE FROM task_templates');
  target.DB.db.exec('DELETE FROM focuses');
  target.DB.db.exec('DELETE FROM project_types');

  const counts = await libraryImport(target.DB, file);
  assert.equal(counts.tasks.inserted, 198);
  assert.equal(counts.focuses.inserted, 10);
  assert.equal(counts.project_types.inserted, 6);
  assert.equal(counts.hooks.inserted, 1);
  assert.equal(counts.affinities.inserted, 1);
  assert.equal(counts.tasks.skipped, 0);

  // Ids differ; everything the file is keyed on does not.
  assert.deepEqual(snapshot(target.DB), before);
});

test('an import reports what it changed, and nothing else', async () => {
  const e = await env();
  const file = await libraryExport(e.DB);
  file.focuses[0].blurb = 'Rewritten in the file, by hand.';
  file.tasks[0].title = 'Renamed in the file.';

  const counts = await libraryImport(e.DB, file);
  assert.equal(counts.focuses.updated, 1);
  assert.equal(counts.tasks.updated, 1);
  assert.equal(counts.focuses.inserted, 0);
  assert.equal(counts.tasks.inserted, 0);
  assert.equal(counts.focus_tags.updated, 0);
  assert.equal(counts.prompt_tags.inserted, 0);

  const row = e.DB.prepare('SELECT blurb FROM focuses WHERE slug = ?')
    .bind(file.focuses[0].slug).first();
  assert.equal(row.blurb, 'Rewritten in the file, by hand.');
});

test('a row the file cannot anchor is skipped, never half-written', async () => {
  const e = await env();
  const file = await libraryExport(e.DB);
  const week4 = file.tasks.find((t) => t.project_type === 'trifold-board');

  const broken = {
    version: 2,
    focuses: [{ slug: '', name: 'Nameless' }],
    tasks: [
      { ...week4, slug: 'orphan-week4', project_type: 'no-such-project' },
      { slug: 'no-week', title: 'x', prompt: 'y', week_theme: 9, tier: 'focus' },
    ],
    focus_tags: [{ focus: 'no-such-focus', tag: 'trade', weight: 3 },
                 { focus: 'ancient-world', tag: 'Not A Tag', weight: 3 }],
    prompt_tags: [{ task: 'no-such-task', namespace: 'topic', tag: 'trade' },
                  { task: 'flag-draw', namespace: 'colour', tag: 'trade' }],
    hooks: [{ country: 'ZZZ', text: 'Nowhere.' }],
    affinities: [{ country: 'JPN', focus: 'ancient-world', score: 5 }],
  };

  const counts = await libraryImport(e.DB, broken);
  assert.equal(counts.focuses.skipped, 1);
  assert.equal(counts.tasks.skipped, 2);
  assert.equal(counts.focus_tags.skipped, 2);
  assert.equal(counts.prompt_tags.skipped, 2);
  assert.equal(counts.hooks.skipped, 1);
  assert.equal(counts.affinities.skipped, 1);
  assert.equal(counts.tasks.inserted, 0);
  assert.equal(e.DB.prepare("SELECT id FROM task_templates WHERE slug = 'orphan-week4'").first(), null);
});

test('the export downloads as a file, and a file with no library in it is refused', async () => {
  const e = await env();
  const res = await apiLibraryExport(req('GET'), e);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition'), /^attachment; filename="globetrotters-library-/);
  assert.equal((await res.json()).version, 2);

  assert.equal((await apiLibraryImport(req('POST', { hello: 'world' }), e)).status, 400);
  assert.equal((await apiLibraryImport(req('POST', { version: 99, tasks: [] }), e)).status, 400);

  const ok = await apiLibraryImport(req('POST', await libraryExport(e.DB)), e);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).changed, false);
});

test('re-running the seed after editing a seeded row leaves the edit alone', async () => {
  const e = await env();
  await apiPatchTask(new Request('https://example.test/x', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Draw the flag, carefully' }),
  }), e, { id: '1' });

  const result = await runSeed(e.DB, SEEDS);
  assert.equal(result.ok, true);
  assert.ok(Object.values(result.inserted).every((c) => c.inserted === 0));

  const row = e.DB.prepare('SELECT title, origin FROM task_templates WHERE id = 1').first();
  assert.equal(row.title, 'Draw the flag, carefully');
  // Still a seed row. Editing it does not make it custom, and Run seed still
  // skips it on the slug.
  assert.equal(row.origin, 'seed');
});
