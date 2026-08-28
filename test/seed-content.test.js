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

// Week 1 draws 4 core + 1 from the other six. Weeks 2 and 3 draw 5 from 25.
// Week 4 is one project type's five, in order, and all six are filled.
//
// Twenty-seven templates was the floor that made the draw work at all, and the
// weeks are far wider than it because the floor sizes the pool for the draw and
// nothing else: five tasks are drawn a week however big the week is, so depth
// costs the kid nothing. What depth buys is nine different months and a focus
// that still means something in month nine.
const WEEK_SIZES = { 1: 10, 2: 25, 3: 25, 4: 30 };

// Six on-theme tasks per focus per week. Three was the floor against a 13-task
// week; against 25 it is not enough to shape a month — three 3s among 22 ones
// is barely more than one on-theme task in a draw of five. Six puts two or
// three of the five on theme, which is what picking a focus is supposed to do.
const MIN_ON_THEME = 6;

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

test('90 task templates, distributed 10 / 25 / 25 / 30', () => {
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

test('every focus holds six on-theme tasks in week 2 and in week 3', () => {
  // §7's focus highlight samples that focus's weight-3 rows, so a focus with
  // none renders an empty panel at the moment a kid is choosing it. Per week,
  // because the draw is per week: a focus with a 3 in week 2 and nothing in
  // week 3 leaves week 3 identical to picking no focus at all.
  //
  // Six rather than three, because the pool is 25 now: a focus needs enough
  // on-theme tasks that the five it draws are not the same five every month.
  // The focus a kid picks nine times has to have nine months in it.
  const covered = rows(`
    SELECT f.slug AS focus, t.week_theme AS week, COUNT(*) AS n
    FROM focuses f
    JOIN task_focus_weights w ON w.focus_id = f.id AND w.weight = 3
    JOIN task_templates t ON t.id = w.task_template_id
    WHERE f.archived = 0 AND t.week_theme IN (2, 3)
    GROUP BY f.id, t.week_theme
  `);
  const n = new Map(covered.map((r) => [`${r.focus}/${r.week}`, r.n]));
  const focuses = rows('SELECT slug FROM focuses WHERE archived = 0').map((r) => r.slug);
  assert.equal(focuses.length, 6);
  for (const focus of focuses) {
    for (const week of [2, 3]) {
      const got = n.get(`${focus}/${week}`) ?? 0;
      assert.ok(got >= MIN_ON_THEME,
        `${focus} has ${got} weight-3 tasks in week ${week}, needs ${MIN_ON_THEME} — ` +
        'below that it draws much the same week every month it is chosen');
    }
  }
});

test('no focus excludes so much of a week that swap runs out of candidates', () => {
  // 25 in the pool, 5 drawn. Exclusions eat the spare that Swap draws from, and
  // the rule stays at one per focus per week: it held when the pool was 8 and
  // again at 13, and the headroom a wider pool buys is for content, not for
  // exclusions.
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
      `${row.focus} excludes ${row.n} of week ${row.week}'s 25 — at most one`);
  }
});

test('a weight is an opinion: 3 or 0, never a middling number', () => {
  const odd = rows('SELECT weight FROM task_focus_weights WHERE weight NOT IN (0, 3)');
  assert.deepEqual(odd, [], 'seed weights are 3 for on-theme and 0 to exclude');
});

test('every task template written into the file is in the database', () => {
  const [{ n }] = rows('SELECT COUNT(*) AS n FROM task_templates');
  assert.equal(n, blockRows('task_templates'),
    'a template did not land — check its project type slug');
});

test('every focus weight written into the file is in the database', () => {
  // The one silent failure mode in this seed: a mistyped task or focus slug is
  // dropped by the join, and the only symptom is a draw that feels slightly
  // wrong three slices from here.
  const [{ n }] = rows('SELECT COUNT(*) AS n FROM task_focus_weights');
  assert.equal(n, blockRows('task_focus_weights'),
    'a weight did not land — a task or focus slug in the block matches nothing');
});

test('no seeded task is left with no focus that reaches for it', () => {
  // Not a failure, but worth seeing: a week 2-3 template that no focus favors
  // is drawn only at baseline weight, forever.
  const orphans = rows(`
    SELECT t.slug FROM task_templates t
    WHERE t.week_theme IN (2, 3)
      AND NOT EXISTS (
        SELECT 1 FROM task_focus_weights w WHERE w.task_template_id = t.id AND w.weight = 3
      )
  `).map((r) => r.slug);
  // 50 templates across weeks 2-3, and some are neutral by design — a wow fact
  // belongs to no focus in particular. The pool must not be mostly neutral, or
  // the focus stops shaping the month at all.
  assert.ok(orphans.length <= 12,
    `${orphans.length} of 50 week 2-3 tasks are neutral to every focus`);
});
