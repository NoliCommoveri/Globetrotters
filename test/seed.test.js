// The seed machinery: idempotence, and the promise that a press never clobbers
// an edit. Run seed is the one control the owner presses repeatedly, so both
// properties are tested against the real 002_seed.sql rather than a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FakeD1 } from './d1.js';
import { applyPending } from '../src/lib/migrations.js';
import { runSeed, SEEDED_TABLES } from '../src/lib/seed.js';

const read = (name) => readFileSync(new URL(`../src/migrations/${name}`, import.meta.url), 'utf8');

const MIGRATIONS = [{ id: '001', name: '001_schema.sql', sql: read('001_schema.sql') }];
const SEEDS = [{ id: '002', name: '002_seed.sql', sql: read('002_seed.sql') }];

async function seeded() {
  const db = new FakeD1();
  await applyPending(db, MIGRATIONS);
  const result = await runSeed(db, SEEDS);
  assert.equal(result.ok, true, JSON.stringify(result.failure));
  return { db, result };
}

test('run seed before apply pending says so rather than failing on the first insert', async () => {
  const db = new FakeD1();
  const result = await runSeed(db, SEEDS);
  assert.equal(result.ok, false);
  assert.match(result.error, /schema/i);
});

test('the first run inserts the fixed rows', async () => {
  const { result } = await seeded();
  assert.equal(result.inserted.people.inserted, 3);
  assert.equal(result.inserted.focuses.inserted, 9);
  assert.equal(result.inserted.project_types.inserted, 6);
});

test('the second run inserts zero into every seeded table', async () => {
  const { db } = await seeded();
  const again = await runSeed(db, SEEDS);
  assert.equal(again.ok, true, JSON.stringify(again.failure));
  for (const table of SEEDED_TABLES) {
    if (!(table in again.inserted)) continue;
    assert.equal(again.inserted[table].inserted, 0, `${table} inserted on the second run`);
  }
});

test('an edit to a seeded row survives a re-run', async () => {
  const { db } = await seeded();

  db.prepare("UPDATE focuses SET name = 'Deep Time' WHERE slug = 'ancient-world'").run();
  db.prepare("UPDATE people SET name = 'Ada', color = '#123456' WHERE id = 1").run();

  await runSeed(db, SEEDS);

  const focus = db.prepare("SELECT name FROM focuses WHERE slug = 'ancient-world'").first();
  assert.equal(focus.name, 'Deep Time');
  const person = db.prepare('SELECT name, color FROM people WHERE id = 1').first();
  assert.deepEqual([person.name, person.color], ['Ada', '#123456']);
});

test('a re-run does not mint a fourth person', async () => {
  const { db } = await seeded();
  await runSeed(db, SEEDS);
  await runSeed(db, SEEDS);
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM people').first();
  assert.equal(n, 3);
});

test('the three inks are distinct six-digit hex', async () => {
  const { db } = await seeded();
  const { results } = db.prepare('SELECT color FROM people ORDER BY sort_order').all();
  const colors = results.map((r) => r.color);
  assert.equal(colors.length, 3);
  for (const c of colors) assert.match(c, /^#[0-9A-Fa-f]{6}$/);
  assert.equal(new Set(colors).size, 3);
});
