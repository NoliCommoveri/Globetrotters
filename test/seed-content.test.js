// Seed v0's content invariants.
//
// These are the exit criteria of slice 02 expressed as assertions, and they run
// against whatever is currently in 002_seed.sql. Until the two hand-written
// lists land — see docs/other/SEED-CONTENT.md — they fail, and each failure
// names exactly what is missing. That is their job: the draw in slice 04 has no
// way to report "the pool was one short", it just produces a thin month.

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

// Week 1 draws 4 core + 1 from the rest. Weeks 2 and 3 draw 5 from 8, so three
// are spare and Swap has somewhere to go. Week 4 is trifold-board's five, in
// order. Twenty-seven is the smallest seed that makes all of that true.
const WEEK_SIZES = { 1: 6, 2: 8, 3: 8, 4: 5 };

let db;
test.before(async () => {
  db = new FakeD1();
  await applyPending(db, MIGRATIONS);
  const result = await runSeed(db, SEEDS);
  assert.equal(result.ok, true, JSON.stringify(result.failure));
});

const rows = (sql) => db.prepare(sql).all().results;

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

test('27 task templates, distributed 6 / 8 / 8 / 5', () => {
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

test('week 4 is one ordered trifold-board sequence and nothing else', () => {
  const week4 = rows(`
    SELECT t.slug, t.position, p.slug AS project
    FROM task_templates t LEFT JOIN project_types p ON p.id = t.project_type_id
    WHERE t.week_theme = 4 ORDER BY t.position
  `);
  assert.equal(week4.length, 5);
  for (const row of week4) {
    assert.equal(row.project, 'trifold-board', `${row.slug}: week 4 is trifold-board only in v0`);
  }
  assert.deepEqual(week4.map((r) => r.position), [1, 2, 3, 4, 5], 'week 4 positions must be 1-5');
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

test('every focus has something to show in the setup preview', () => {
  // §7's focus highlight samples that focus's weight-3 rows. A focus with none
  // renders an empty panel at the moment a kid is choosing it.
  const covered = rows(`
    SELECT f.slug, COUNT(w.task_template_id) AS n
    FROM focuses f
    LEFT JOIN task_focus_weights w ON w.focus_id = f.id AND w.weight = 3
    LEFT JOIN task_templates t ON t.id = w.task_template_id AND t.week_theme IN (2, 3)
    WHERE f.archived = 0
    GROUP BY f.id
  `);
  assert.equal(covered.length, 6);
  for (const f of covered) {
    assert.ok(f.n >= 1, `${f.slug} has no weight-3 task in weeks 2-3`);
  }
});

test('no focus excludes so much of a week that swap runs out of candidates', () => {
  // 8 in the pool, 5 drawn. One exclusion leaves two spare; two exclusions
  // leave one; three leave none and Swap is dead for that focus.
  const excluded = rows(`
    SELECT f.slug AS focus, t.week_theme AS week, COUNT(*) AS n
    FROM task_focus_weights w
    JOIN focuses f ON f.id = w.focus_id
    JOIN task_templates t ON t.id = w.task_template_id
    WHERE w.weight = 0 AND t.week_theme IN (2, 3)
    GROUP BY f.id, t.week_theme
  `);
  for (const row of excluded) {
    assert.ok(row.n <= 1,
      `${row.focus} excludes ${row.n} of week ${row.week}'s 8 — at most one`);
  }
});

test('a weight is an opinion: 3 or 0, never a middling number', () => {
  const odd = rows('SELECT weight FROM task_focus_weights WHERE weight NOT IN (0, 3)');
  assert.deepEqual(odd, [], 'seed weights are 3 for on-theme and 0 to exclude');
});
