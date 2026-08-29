// The library's content invariants.
//
// They run against whatever is currently in 002_seed.sql — see
// docs/other/SEED-CONTENT.md — and each failure names exactly what is missing.
// That is their job: the draw has no way to report "the pool was one short", it
// just quietly produces a thin month.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FakeD1 } from './d1.js';
import { applyPending } from '../src/lib/migrations.js';
import { runSeed } from '../src/lib/seed.js';

const read = (name) => readFileSync(new URL(`../src/migrations/${name}`, import.meta.url), 'utf8');
const MIGRATIONS = [{ id: '001', name: '001_schema.sql', sql: read('001_schema.sql') }];
const SEEDS = [{ id: '002', name: '002_seed.sql', sql: read('002_seed.sql') }];

const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

// Week 1 draws 4 core + 1 from the other six. Weeks 2 and 3 are one pool of 51
// — 49 drawable and two pinned — and eight come out of it. Week 4 is one
// project type's five, in order, and all six are filled.
//
// The counts by natural half are lopsided by one because `wow-fact` is pinned
// to week 2 and `cook-it` to week 3, and `week_theme` is the prompt's natural
// half rather than a draw pool. Nothing in the draw reads these numbers; the
// deal's arc preference is the only thing that does.
const WEEK_SIZES = { 1: 10, 2: 26, 3: 25, 4: 30 };

// The seven mode tags. A month draws at most one prompt carrying each, and it
// draws at least one `hands-on` and one `personal-voice` — so a mode tag
// invented in a seed edit is a rule that silently stops applying.
const MODE_TAGS = ['us-contrast', 'demographics-stat', 'measurement', 'hands-on',
                   'map-work', 'personal-voice', 'scripture-read'];

// A smoke floor, not the target. LIBRARY_v3.md §3 puts a finished focus at
// 41-66 prompts above baseline and 10-40 on-theme; against the 49 drawable
// prompts seeded today the thinnest lifts nine. Six is low enough to have
// headroom and high enough that a mistyped tag set — the one silent failure in
// this file — fails here rather than three months into a school year.
const MIN_REACH = 6;

let db;
test.before(async () => {
  db = new FakeD1();
  await applyPending(db, MIGRATIONS);
  const result = await runSeed(db, SEEDS);
  assert.equal(result.ok, true, JSON.stringify(result.failure));
});

const rows = (sql) => db.prepare(sql).all().results;

// Rows between a `-- BEGIN x` / `-- END x` pair in the seed file. Both blocks
// are joined to their lookup tables on a slug, and a slug that matches nothing
// contributes no row and raises no error — so the count that was written is
// compared against the count that landed rather than trusted.
function blockRows(name) {
  const sql = SEEDS[0].sql;
  const body = sql.slice(
    sql.indexOf(`-- BEGIN ${name}`) + `-- BEGIN ${name}`.length,
    sql.indexOf(`-- END ${name}`),
  );
  return body.split('\n').filter((line) => line.trim().startsWith('(')).length;
}

test('195 countries, each with a real continent and an adventure level', () => {
  const countries = rows('SELECT name, iso3, continent, region, research_depth FROM countries');
  assert.equal(countries.length, 195,
    `seed v0 needs 195 countries, found ${countries.length} — see docs/other/SEED-CONTENT.md`);

  for (const c of countries) {
    assert.match(c.iso3, /^[A-Z]{3}$/, `${c.name}: iso3 must be three uppercase letters`);
    assert.ok(CONTINENTS.includes(c.continent), `${c.name}: unknown continent ${c.continent}`);
    assert.ok(c.research_depth >= 1 && c.research_depth <= 3, `${c.name}: bad research_depth`);
  }
  assert.equal(new Set(countries.map((c) => c.iso3)).size, countries.length, 'duplicate iso3');
});

test('91 task templates, distributed 10 / 26 / 25 / 30', () => {
  const counts = Object.fromEntries(
    rows('SELECT week_theme, COUNT(*) AS n FROM task_templates GROUP BY week_theme')
      .map((r) => [r.week_theme, r.n]),
  );
  for (const [week, want] of Object.entries(WEEK_SIZES)) {
    assert.equal(counts[week] ?? 0, want,
      `week ${week} needs ${want} templates, found ${counts[week] ?? 0}`);
  }
});

test('week 1 carries exactly four core tasks — the workbook pages depend on them', () => {
  const core = rows("SELECT slug FROM task_templates WHERE week_theme = 1 AND tier = 'core'");
  assert.equal(core.length, 4, `week 1 needs 4 core templates, found ${core.length}`);
});

test('every project type has a full week-4 sequence, in order', () => {
  // A project type with an empty week 4 is hidden in setup and refused by the
  // server, so an unfilled one is a project type that does not exist as far as
  // a kid is concerned. All six are filled.
  const week4 = rows(`
    SELECT t.slug, t.position, p.slug AS project
    FROM task_templates t LEFT JOIN project_types p ON p.id = t.project_type_id
    WHERE t.week_theme = 4 ORDER BY p.slug, t.position
  `);
  assert.equal(week4.length, 30);

  const types = rows('SELECT slug FROM project_types WHERE archived = 0').map((r) => r.slug);
  assert.equal(types.length, 6);
  for (const type of types) {
    const seq = week4.filter((r) => r.project === type);
    assert.deepEqual(seq.map((r) => r.position), [1, 2, 3, 4, 5],
      `${type}: week 4 must be five tasks at positions 1-5`);
  }
});

test('no template outside week 4 claims a project type or a position', () => {
  const stray = rows(`
    SELECT slug FROM task_templates
    WHERE week_theme <> 4 AND (project_type_id IS NOT NULL OR position IS NOT NULL)
  `);
  assert.deepEqual(stray.map((r) => r.slug), []);
});

test('every prompt is written to be read, not skimmed', () => {
  for (const t of rows('SELECT slug, title, prompt FROM task_templates')) {
    assert.ok(t.title.trim().length > 0, `${t.slug}: empty title`);
    assert.ok(t.prompt.trim().length >= 30, `${t.slug}: prompt is too short to be an instruction`);
    assert.ok(t.prompt.length <= 400, `${t.slug}: prompt will not fit a task card`);
  }
});

test('the two pins are the only fixed tasks, one to each week', () => {
  const pins = rows("SELECT slug, week_theme FROM task_templates WHERE tier = 'fixed'");
  assert.deepEqual(
    pins.map((r) => [r.slug, r.week_theme]).sort(),
    [['cook-it', 3], ['wow-fact', 2]],
  );
});

test('every week 1-3 prompt carries topic tags', () => {
  // An untagged prompt is drawn at baseline forever and nothing reports it, so
  // a prompt and its tags are written in the same edit or not at all. This is
  // the assertion that makes that true rather than intended.
  const bare = rows(`
    SELECT t.slug FROM task_templates t
    WHERE t.week_theme IN (1, 2, 3)
      AND NOT EXISTS (
        SELECT 1 FROM prompt_tags p
        WHERE p.task_template_id = t.id AND p.namespace = 'topic'
      )
  `).map((r) => r.slug);
  assert.deepEqual(bare, [], 'these prompts carry no topic tag and can never be on theme');
});

test('a mode tag is one of the seven, and a tag is lowercase words with hyphens', () => {
  for (const row of rows('SELECT task_template_id, namespace, tag FROM prompt_tags')) {
    assert.match(row.tag, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${row.tag}: not a tag`);
    if (row.namespace === 'mode') {
      assert.ok(MODE_TAGS.includes(row.tag),
        `${row.tag} is not one of the seven modes — the balance rule would skip it`);
    }
  }
});

test('every focus weights its tags 1 to 3 and reaches enough of the pool to matter', () => {
  const focuses = rows('SELECT id, slug FROM focuses WHERE archived = 0');
  assert.equal(focuses.length, 9);

  const reach = new Map(rows(`
    SELECT ft.focus_id, COUNT(DISTINCT t.id) AS n
    FROM focus_tags ft
    JOIN prompt_tags p ON p.tag = ft.tag AND p.namespace = 'topic'
    JOIN task_templates t ON t.id = p.task_template_id
     AND t.week_theme IN (2, 3) AND t.tier != 'fixed' AND t.archived = 0
    GROUP BY ft.focus_id
  `).map((r) => [r.focus_id, r.n]));

  for (const focus of focuses) {
    const got = reach.get(focus.id) ?? 0;
    assert.ok(got >= MIN_REACH,
      `${focus.slug} lifts ${got} of the 49 drawable prompts above baseline, needs ${MIN_REACH}` +
      ' — below that, picking it is much the same as picking nothing');
  }

  const odd = rows('SELECT tag, weight FROM focus_tags WHERE weight NOT IN (1, 2, 3)');
  assert.deepEqual(odd, [], 'a focus tag weight is 1, 2 or 3; no opinion stores no row');
});

test('People and Power does not weight civic-process, which governance already covers', () => {
  // All four `civic-process` prompts carry `governance` too, so weighting both
  // at 3 pays twice for the same four rows. The tag stays on the prompts as
  // documentation of what they are (LIBRARY_v3.md §7).
  const paid = rows(`
    SELECT 1 FROM focus_tags ft JOIN focuses f ON f.id = ft.focus_id
    WHERE f.slug = 'people-and-power' AND ft.tag = 'civic-process'
  `);
  assert.deepEqual(paid, []);

  const both = rows(`
    SELECT t.slug FROM task_templates t
    JOIN prompt_tags civic ON civic.task_template_id = t.id AND civic.tag = 'civic-process'
    WHERE NOT EXISTS (
      SELECT 1 FROM prompt_tags g
      WHERE g.task_template_id = t.id AND g.tag = 'governance'
    )
  `).map((r) => r.slug);
  assert.deepEqual(both, [], 'civic-process is only a subset of governance while this is empty');
});

test('every task template written into the file is in the database', () => {
  const [{ n }] = rows('SELECT COUNT(*) AS n FROM task_templates');
  assert.equal(n, blockRows('task_templates'),
    'a template did not land — check its project type slug');
});

test('every tag row written into the file is in the database', () => {
  // The one silent failure mode in this seed: a mistyped task or focus slug is
  // dropped by the join, and the only symptom is a draw that feels slightly
  // wrong three slices from here.
  const [{ n: prompt }] = rows('SELECT COUNT(*) AS n FROM prompt_tags');
  assert.equal(prompt, blockRows('prompt_tags'),
    'a prompt tag did not land — a task slug in the block matches nothing');

  const [{ n: focus }] = rows('SELECT COUNT(*) AS n FROM focus_tags');
  assert.equal(focus, blockRows('focus_tags'),
    'a focus tag did not land — a focus slug in the block matches nothing');
});

test('most of the pool is reachable by some focus', () => {
  // Not a failure on its own: a prompt no focus lifts is still drawn, at
  // baseline, forever. But a pool that is mostly unreachable is one where the
  // focus has stopped shaping the month at all.
  const drawable = rows(
    "SELECT id FROM task_templates WHERE week_theme IN (2, 3) AND tier != 'fixed'"
  ).length;
  const reached = rows(`
    SELECT DISTINCT t.id FROM task_templates t
    JOIN prompt_tags p ON p.task_template_id = t.id AND p.namespace = 'topic'
    JOIN focus_tags ft ON ft.tag = p.tag
    WHERE t.week_theme IN (2, 3) AND t.tier != 'fixed'
  `).length;
  assert.ok(reached >= drawable * 0.75,
    `${reached} of ${drawable} drawable prompts are reachable by any focus`);
});
