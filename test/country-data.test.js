// 003_country_data.sql's content invariants (DESIGN.md §9).
//
// The seed is the app's only source of country data — there is no runtime API
// to fall back on — so what this file asserts is what the picker will have.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FakeD1 } from './d1.js';
import { applyPending } from '../src/lib/migrations.js';
import { runSeed } from '../src/lib/seed.js';

const read = (name) => readFileSync(new URL(`../src/migrations/${name}`, import.meta.url), 'utf8');
const MIGRATIONS = [{ id: '001', name: '001_schema.sql', sql: read('001_schema.sql') }];
const SEEDS = [
  { id: '002', name: '002_seed.sql', sql: read('002_seed.sql') },
  { id: '003', name: '003_country_data.sql', sql: read('003_country_data.sql') },
];

let db;
test.before(async () => {
  db = new FakeD1();
  await applyPending(db, MIGRATIONS);
  const result = await runSeed(db, SEEDS);
  assert.equal(result.ok, true, JSON.stringify(result.failure));
});

const rows = (sql) => db.prepare(sql).all().results;

// Rows written between a `-- BEGIN x` / `-- END x` pair. Both blocks are joined
// to `countries` on an ISO3, and a code that matches nothing contributes no row
// and raises no error — so what was written is counted against what landed.
function blockRows(name) {
  const sql = SEEDS[1].sql;
  const body = sql.slice(
    sql.indexOf(`-- BEGIN ${name}`) + `-- BEGIN ${name}`.length,
    sql.indexOf(`-- END ${name}`),
  );
  return body.split('\n').filter((line) => line.trim().startsWith('(')).length;
}

test('coverage is 75-100 countries, and the rest stay selectable', () => {
  const [{ n }] = rows('SELECT COUNT(DISTINCT country_id) AS n FROM country_hooks');
  assert.ok(n >= 75 && n <= 100, `${n} countries carry hooks, wanted 75-100`);
  const [{ total }] = rows('SELECT COUNT(*) AS total FROM countries');
  assert.equal(total, 195, 'every country stays pickable, hooks or no hooks');
});

test('every hook written into the file landed in the database', () => {
  // The silent failure mode: a mistyped ISO3 is dropped by the join and the
  // only symptom is a country that quietly never appears in the shuffle.
  const [{ n }] = rows('SELECT COUNT(*) AS n FROM country_hooks');
  assert.equal(n, blockRows('country_hooks'), 'a hook did not land — check its ISO3');
  const [{ a }] = rows('SELECT COUNT(*) AS a FROM country_focus_affinity');
  assert.equal(a, blockRows('country_focus_affinity'),
    'an affinity did not land — check its ISO3 or focus slug');
});

test('an adorned country carries two or three hooks and two or three affinities', () => {
  // Two is the floor the shuffle draws against: a country with one hook is a
  // card with nothing on it once the first line is used.
  for (const row of rows(`
    SELECT c.name, COUNT(h.id) AS n FROM countries c
    JOIN country_hooks h ON h.country_id = c.id GROUP BY c.id
  `)) {
    assert.ok(row.n >= 2 && row.n <= 3, `${row.name}: ${row.n} hooks, wanted 2 or 3`);
  }
  for (const row of rows(`
    SELECT c.name, COUNT(*) AS n FROM countries c
    JOIN country_focus_affinity a ON a.country_id = c.id GROUP BY c.id
  `)) {
    assert.ok(row.n >= 2 && row.n <= 3, `${row.name}: ${row.n} affinities, wanted 2 or 3`);
  }
});

test('hooks and affinities cover the same countries', () => {
  // A country in the shuffle with no recommended focus is a card that stops
  // halfway: the kid taps through and setup has nothing to say about what the
  // month would be like.
  const mismatched = rows(`
    SELECT c.name FROM countries c
    WHERE EXISTS (SELECT 1 FROM country_hooks h WHERE h.country_id = c.id)
       != EXISTS (SELECT 1 FROM country_focus_affinity a WHERE a.country_id = c.id)
  `).map((r) => r.name);
  assert.deepEqual(mismatched, []);
});

test('coverage spreads across continents, adventure levels and focuses', () => {
  // §9 asks for spread, not for the hundred best-documented countries: a
  // shuffle that only ever deals Europe is a picker with an opinion nobody
  // asked it for.
  const continents = rows(`
    SELECT c.continent, COUNT(DISTINCT c.id) AS n FROM countries c
    JOIN country_hooks h ON h.country_id = c.id GROUP BY c.continent
  `);
  assert.equal(continents.length, 6, 'every continent needs hooked countries');
  for (const row of continents) {
    assert.ok(row.n >= 5, `${row.continent}: only ${row.n} countries carry hooks`);
  }

  const depths = rows(`
    SELECT c.research_depth AS d, COUNT(DISTINCT c.id) AS n FROM countries c
    JOIN country_hooks h ON h.country_id = c.id GROUP BY c.research_depth
  `);
  assert.equal(depths.length, 3, 'all three adventure levels need hooked countries');

  const focuses = rows(`
    SELECT f.slug, COUNT(*) AS n FROM country_focus_affinity a
    JOIN focuses f ON f.id = a.focus_id GROUP BY f.id
  `);
  assert.equal(focuses.length, 6);
  for (const row of focuses) {
    assert.ok(row.n >= 15, `${row.slug} is recommended for only ${row.n} countries`);
  }
});

test('an affinity is a recommendation with a reason, never a warning', () => {
  // Only 2 and 3 exist. There is deliberately no way to say "bad fit": the kid
  // may pick any focus for any country, and the app's job is to say what is
  // good about a choice, not to argue with it.
  for (const row of rows(`
    SELECT c.name, f.slug AS focus, a.score, a.reason
    FROM country_focus_affinity a
    JOIN countries c ON c.id = a.country_id
    JOIN focuses f ON f.id = a.focus_id
  `)) {
    assert.ok(row.score === 2 || row.score === 3, `${row.name}/${row.focus}: score ${row.score}`);
    assert.ok(row.reason && row.reason.trim().length >= 15,
      `${row.name}/${row.focus}: a recommendation with no reason is just a number`);
    assert.ok(row.reason.length <= 90,
      `${row.name}/${row.focus}: the reason must read in one breath under the focus name`);
  }
});

test('a second press changes nothing, and does not resurrect a deleted hook', async () => {
  // country_hooks has no unique key to conflict on, so the insert is guarded on
  // the country instead. That is what makes the library editor's one delete
  // (Q-14) survive every future press of Run seed.
  const before = rows('SELECT COUNT(*) AS n FROM country_hooks')[0].n;
  const junk = rows('SELECT id, country_id FROM country_hooks ORDER BY id LIMIT 1')[0];
  db.prepare(`DELETE FROM country_hooks WHERE id = ${junk.id}`).run();

  const again = await runSeed(db, SEEDS);
  assert.equal(again.ok, true, JSON.stringify(again.failure));
  assert.equal(again.inserted.country_hooks.inserted, 0, 'a re-run must insert no hook');
  assert.equal(again.inserted.country_focus_affinity.inserted, 0);
  assert.equal(rows('SELECT COUNT(*) AS n FROM country_hooks')[0].n, before - 1,
    'the deleted hook came back');
});

test('the adventure level says what a month will actually be like', () => {
  // The revision is the honest half of §9: a 1 promises "lots to find", and a
  // country where an 11-year-old will hit twenty dead ends must not carry it.
  const depth = (iso3) =>
    rows(`SELECT research_depth AS d FROM countries WHERE iso3 = '${iso3}'`)[0].d;
  assert.equal(depth('BOL'), 1, 'Bolivia was revised down when its hooks were written');
  assert.equal(depth('PRK'), 2, 'North Korea is not a "lots to find" month');
  assert.equal(depth('SYR'), 2);
  assert.equal(depth('TUV'), 3, 'Tuvalu stays an honest hunt');

  for (const row of rows('SELECT name, research_depth AS d FROM countries')) {
    assert.ok(row.d >= 1 && row.d <= 3, `${row.name}: adventure level ${row.d}`);
  }
});
