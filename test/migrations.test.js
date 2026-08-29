import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FakeD1 } from './d1.js';
import { splitStatements } from '../src/lib/sql.js';
import {
  migrationStatus, applyPending, eraseAll, resetMonth, resetStatements, SCHEMA_TABLES,
} from '../src/lib/migrations.js';
import { runSeed } from '../src/lib/seed.js';
import { drawPlan } from '../src/lib/draw.js';

const SCHEMA = readFileSync(new URL('../src/migrations/001_schema.sql', import.meta.url), 'utf8');
const LIST = [{ id: '001', name: '001_schema.sql', sql: SCHEMA }];

function tables(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
    .results.map((r) => r.name);
}

test('apply pending on an empty database creates every table in §5', async () => {
  const db = new FakeD1();
  const result = await applyPending(db, LIST);
  assert.equal(result.ok, true, JSON.stringify(result.failure));
  assert.equal(result.applied.length, 1);

  const present = tables(db);
  for (const table of SCHEMA_TABLES) assert.ok(present.includes(table), `missing ${table}`);
  assert.ok(present.includes('_migrations'));
});

test('pressing it again reports nothing pending and does not re-run', async () => {
  const db = new FakeD1();
  await applyPending(db, LIST);

  const status = await migrationStatus(db, LIST);
  assert.deepEqual(status.map((r) => r.state), ['applied']);

  // A re-run of CREATE TABLE would throw. Nothing pending means nothing runs.
  const again = await applyPending(db, LIST);
  assert.equal(again.ok, true);
  assert.deepEqual(again.applied, []);
});

test('editing an applied file shows drift rather than reapplying it', async () => {
  const db = new FakeD1();
  await applyPending(db, LIST);

  const edited = [{ ...LIST[0], sql: `${SCHEMA}\nALTER TABLE people ADD COLUMN nickname TEXT;` }];
  const status = await migrationStatus(db, edited);
  assert.deepEqual(status.map((r) => r.state), ['drifted']);

  const result = await applyPending(db, edited);
  assert.deepEqual(result.applied, [], 'drift is shown, never applied');
  assert.ok(!tables(db).includes('nickname'));
});

test('an applied migration whose file is gone is drift too', async () => {
  const db = new FakeD1();
  await applyPending(db, LIST);
  const status = await migrationStatus(db, []);
  assert.deepEqual(status.map((r) => [r.id, r.state]), [['001', 'drifted']]);
});

test('a broken migration halts with the failing statement and commits what came before', async () => {
  const db = new FakeD1();
  const broken = [{
    id: '001',
    name: '001_broken.sql',
    sql: `
      CREATE TABLE good_one (id INTEGER PRIMARY KEY);
      CREATE TABLE bad_one (id INTEGER PRIMARY KEY REFERENCES nowhere(id), x NOT A TYPE);
      CREATE TABLE never_reached (id INTEGER PRIMARY KEY);
    `,
  }];

  const result = await applyPending(db, broken);
  assert.equal(result.ok, false);
  assert.equal(result.failure.name, '001_broken.sql');
  assert.match(result.failure.statement, /bad_one/);
  assert.ok(result.failure.error.length > 0);
  assert.equal(result.failure.statementNumber, 2);
  assert.equal(result.failure.of, 3);

  const present = tables(db);
  assert.ok(present.includes('good_one'), 'the statement before the failure is committed');
  assert.ok(!present.includes('never_reached'));

  // Not recorded, so it stays pending — fixing it means adding a new file.
  const status = await migrationStatus(db, broken);
  assert.deepEqual(status.map((r) => r.state), ['pending']);
});

test('a migration larger than one chunk still applies whole', async () => {
  const db = new FakeD1();
  const statements = Array.from({ length: 120 }, (_, i) => `CREATE TABLE t${i} (id INTEGER PRIMARY KEY);`);
  const big = [{ id: '001', name: 'big.sql', sql: statements.join('\n') }];

  const result = await applyPending(db, big);
  assert.equal(result.ok, true);
  assert.equal(result.applied[0].statements, 120);
  assert.equal(tables(db).filter((t) => /^t\d+$/.test(t)).length, 120);
});

test('reset month deletes a plan and its children without a foreign key error', async () => {
  const db = new FakeD1();
  await applyPending(db, LIST);

  db.prepare(`INSERT INTO people (id, name, color, sort_order, created_at)
              VALUES (1, 'Kid', '#c00', 0, '2026-09-01T00:00:00Z')`).run();
  db.prepare(`INSERT INTO countries (id, name, iso3, continent, research_depth)
              VALUES (1, 'Japan', 'JPN', 'Asia', 1)`).run();
  db.prepare("INSERT INTO focuses (id, slug, name) VALUES (1, 'food', 'Food')").run();
  db.prepare("INSERT INTO project_types (id, slug, name) VALUES (1, 'model', 'Model')").run();
  db.prepare(`INSERT INTO task_templates (id, slug, title, prompt, week_theme, tier)
              VALUES (1, 'flag', 'Draw the flag', 'Draw it; color it', 1, 'core')`).run();
  db.prepare(`INSERT INTO month_plans
              (id, person_id, month, start_date, country_id, focus_id, project_type_id, status, created_at)
              VALUES (7, 1, '2026-09', '2026-08-31', 1, 1, 1, 'active', '2026-09-01T00:00:00Z')`).run();
  db.prepare(`INSERT INTO plan_tasks (id, plan_id, task_template_id, week_no, position, status)
              VALUES (11, 7, 1, 1, 0, 'done')`).run();
  db.prepare(`INSERT INTO sessions (plan_id, plan_task_id, minutes, logged_at, local_date)
              VALUES (7, 11, 12, '2026-09-02T15:00:00Z', '2026-09-02')`).run();
  db.prepare(`INSERT INTO media (plan_id, plan_task_id, r2_key, kind, uploaded_at)
              VALUES (7, 11, 'k', 'photo', '2026-09-02T15:00:00Z')`).run();
  db.prepare(`INSERT INTO stamps (plan_id, person_id, country_id, focus_id, earned_at)
              VALUES (7, 1, 1, 1, '2026-09-30T00:00:00Z')`).run();

  const deleted = await resetMonth(db, 7);
  assert.deepEqual(deleted, {
    sessions: 1, media: 1, stamps: 1, plan_tasks: 1, month_plans: 1,
  });

  for (const table of ['sessions', 'media', 'stamps', 'plan_tasks', 'month_plans']) {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first();
    assert.equal(row.n, 0, `${table} not emptied`);
  }
  // The library and the people survive: reset month is not reset everything.
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM people').first().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM task_templates').first().n, 1);
});

test('any other delete order hits a foreign key error', async () => {
  const order = resetStatements().map((s) => s.table);
  assert.deepEqual(order, ['sessions', 'media', 'stamps', 'plan_tasks', 'month_plans']);

  const db = new FakeD1();
  await applyPending(db, LIST);
  db.prepare(`INSERT INTO people (id, name, color, sort_order, created_at)
              VALUES (1, 'Kid', '#c00', 0, '2026-09-01T00:00:00Z')`).run();
  db.prepare(`INSERT INTO countries (id, name, iso3, continent, research_depth)
              VALUES (1, 'Japan', 'JPN', 'Asia', 1)`).run();
  db.prepare("INSERT INTO focuses (id, slug, name) VALUES (1, 'food', 'Food')").run();
  db.prepare("INSERT INTO project_types (id, slug, name) VALUES (1, 'model', 'Model')").run();
  db.prepare(`INSERT INTO month_plans
              (id, person_id, month, start_date, country_id, focus_id, project_type_id, status, created_at)
              VALUES (7, 1, '2026-09', '2026-08-31', 1, 1, 1, 'active', '2026-09-01T00:00:00Z')`).run();
  db.prepare(`INSERT INTO stamps (plan_id, person_id, country_id, focus_id, earned_at)
              VALUES (7, 1, 1, 1, '2026-09-30T00:00:00Z')`).run();

  assert.throws(() => db.prepare('DELETE FROM month_plans WHERE id = ?').bind(7).run(),
    /FOREIGN KEY/i);
});

// A statement may open with the comment block that precedes it — the file's own
// header, and the notes above the two tag tables. SQLite accepts that, and the
// splitter is right not to strip it: the checksum is over the file as written.
test('the schema file is one statement per table and index, and splits cleanly', () => {
  const statements = splitStatements(SCHEMA);
  const created = statements
    .map((s) => s.match(/CREATE TABLE (\w+)/i))
    .filter(Boolean).map((m) => m[1]);
  const indexes = statements.filter((s) => /CREATE INDEX/i.test(s));

  assert.deepEqual([...created].sort(), [...SCHEMA_TABLES].sort());
  assert.equal(indexes.length, 6);
  assert.equal(statements.length, created.length + indexes.length);
});

// D1 is the only implementation that matters here and it takes DDL in a batch.
// If a future runtime refuses one, the replay applies the statements singly and
// the migration must still count as applied rather than halting on a batch call
// that is not the failure.
test('a batch call that fails on statements that each succeed is not a halt', async () => {
  const db = new FakeD1();
  db.batch = () => { throw new Error('batch not supported here'); };

  const result = await applyPending(db, LIST);
  assert.equal(result.ok, true, JSON.stringify(result.failure));
  assert.equal(result.applied.length, 1);
  for (const table of SCHEMA_TABLES) assert.ok(tables(db).includes(table), `missing ${table}`);
});

// Erase everything. The point of it is that the schema files stop being
// append-only: 001 can be edited and the database rebuilt from it (§3).
test('erase drops every table, the ledger included, and apply pending runs again', async () => {
  const db = new FakeD1();
  await applyPending(db, LIST);
  assert.ok(tables(db).includes('_migrations'));

  const erased = await eraseAll(db);
  assert.equal(erased.ok, true, erased.error);
  assert.deepEqual(erased.remaining, []);
  for (const table of SCHEMA_TABLES) assert.ok(erased.dropped.includes(table), `kept ${table}`);
  assert.ok(erased.dropped.includes('_migrations'));
  assert.deepEqual(tables(db).filter((t) => !t.startsWith('sqlite_')), []);

  const again = await applyPending(db, LIST);
  assert.equal(again.ok, true, JSON.stringify(again.failure));
  assert.equal(again.applied.length, 1);
  for (const table of SCHEMA_TABLES) assert.ok(tables(db).includes(table), `missing ${table}`);
});

// D1 enforces foreign keys and DROP TABLE does an implicit DELETE, so a parent
// with live children refuses to drop. The order is discovered, not declared.
// The whole browser-only rebuild, end to end and in the order the buttons sit
// on the page. It is the assertion that makes editing 001 and 002 in place a
// real workflow rather than a claim in a comment: a schema change is an edit
// and three presses (§3), and what comes out the other side draws a month.
test('erase everything, apply pending, run seed rebuilds a database that draws', async () => {
  const read = (name) => readFileSync(new URL(`../src/migrations/${name}`, import.meta.url), 'utf8');
  const migrations = ['001_schema.sql', '004_worksheets.sql']
    .map((name) => ({ id: name.slice(0, 3), name, sql: read(name) }));
  const seeds = ['002_seed.sql', '003_country_data.sql', '005_worksheet_layouts.sql']
    .map((name) => ({ id: name.slice(0, 3), name, sql: read(name) }));

  const db = new FakeD1();
  await applyPending(db, migrations);
  await runSeed(db, seeds);

  const drew = async () => {
    const templates = db.prepare(`
      SELECT t.id, t.slug, t.week_theme, t.tier, t.project_type_id, t.position,
             t.worksheet_layout_id AS form, COALESCE(w.height_thirds, 1) AS thirds
      FROM task_templates t
      LEFT JOIN worksheet_layouts w ON w.id = t.worksheet_layout_id
      WHERE t.archived = 0
    `).all().results.map((t) => ({ ...t, modes: [] }));
    const project = db.prepare('SELECT id FROM project_types LIMIT 1').all().results[0];
    return drawPlan({
      templates,
      projectTypeId: project.id,
      focusWeight: () => 1,
      monthsSince: () => null,
      random: Math.random,
    });
  };
  assert.equal((await drew()).length, 20);

  const erased = await eraseAll(db);
  assert.equal(erased.ok, true, erased.error);

  const applied = await applyPending(db, migrations);
  assert.equal(applied.ok, true, JSON.stringify(applied.failure));
  const seeded = await runSeed(db, seeds);
  assert.equal(seeded.ok, true, JSON.stringify(seeded.failure));

  // Everything is back, including the two tables and the tier the append-only
  // rule could never have added to 001.
  assert.equal(seeded.inserted.focuses.rows, 9);
  assert.ok(seeded.inserted.focus_tags.rows > 0);
  assert.ok(seeded.inserted.prompt_tags.rows > 0);
  assert.equal((await drew()).length, 20);
});

test('erase drops a parent whose children hold rows', async () => {
  const db = new FakeD1();
  await applyPending(db, LIST);

  await db.prepare(
    "INSERT INTO people (id, name, color, sort_order, created_at) VALUES (1, 'A', '#000000', 0, '2026-09-01')"
  ).run();
  await db.prepare(
    "INSERT INTO countries (id, name, iso3, continent) VALUES (1, 'Peru', 'PER', 'South America')"
  ).run();
  await db.prepare("INSERT INTO focuses (id, slug, name) VALUES (1, 'f', 'F')").run();
  await db.prepare("INSERT INTO project_types (id, slug, name) VALUES (1, 'p', 'P')").run();
  await db.prepare(`INSERT INTO month_plans
    (id, person_id, month, start_date, country_id, focus_id, project_type_id, status, created_at)
    VALUES (1, 1, '2026-09', '2026-09-01', 1, 1, 1, 'active', '2026-09-01')`).run();

  const erased = await eraseAll(db);
  assert.equal(erased.ok, true, erased.error);
  assert.deepEqual(tables(db).filter((t) => !t.startsWith('sqlite_')), []);
});
