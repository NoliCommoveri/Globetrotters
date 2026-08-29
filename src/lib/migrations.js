// The migration runner. Everything here runs from a browser; nothing here has a
// terminal equivalent, by design (DESIGN.md §3).

import { splitStatements, checksum } from './sql.js';

// The migration list arrives as an argument rather than an import. ../migrations
// holds it, and keeping the `.sql` imports out of here is what lets this file be
// tested against a real SQLite outside the Worker — where a text import does not
// exist.

// D1 caps how much one batch can carry, and the seed migrations are hundreds of
// statements. Fifty is small enough to stay well under it and large enough that
// a schema migration is one or two round trips.
const CHUNK = 50;

// The runner bootstraps its own bookkeeping table. It cannot live in 001,
// because reading 001's state requires it to already exist.
async function ensureTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS _migrations (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    checksum   TEXT NOT NULL
  )`).run();
}

// applied | pending | drifted. Drift is an applied migration whose file has
// changed since it ran. It is shown and never fixed: silently reapplying an
// edited file is how a browser-only workflow loses data it cannot get back.
export async function migrationStatus(db, migrations) {
  await ensureTable(db);
  const { results } = await db.prepare(
    'SELECT id, name, applied_at, checksum FROM _migrations'
  ).all();
  const applied = new Map(results.map((r) => [r.id, r]));

  const rows = [];
  for (const m of migrations) {
    const row = applied.get(m.id);
    const sum = await checksum(m.sql);
    if (!row) {
      rows.push({ ...m, state: 'pending', applied_at: null, statements: splitStatements(m.sql).length });
    } else {
      rows.push({
        ...m,
        state: row.checksum === sum ? 'applied' : 'drifted',
        applied_at: row.applied_at,
        statements: splitStatements(m.sql).length,
      });
    }
  }

  // A row in _migrations with no file is drift too — a migration was applied and
  // then deleted from the repo — and it is worth seeing rather than hiding.
  for (const [id, row] of applied) {
    if (!migrations.some((m) => m.id === id)) {
      rows.push({ id, name: row.name, state: 'drifted', applied_at: row.applied_at, statements: 0, missing: true });
    }
  }

  rows.sort((a, b) => a.id.localeCompare(b.id));
  return rows;
}

// Runs a list of statements in chunks, halting on the first that D1 rejects.
//
// Each chunk goes through db.batch(), which is atomic: a chunk that fails
// applies nothing. That is what makes the failure path exact — the chunk is
// replayed one statement at a time, which commits the statements before the bad
// one and names the bad one. Without the replay the page could only say "this
// file failed", which is not something you can act on from a phone.
//
// Shared by Apply pending and Run seed. They differ in what a halt costs, not
// in how a statement is run: a halted migration leaves committed DDL that only
// a new file can fix, while a halted seed is simply pressed again.
export async function runChunked(db, statements) {
  let done = 0;

  for (let i = 0; i < statements.length; i += CHUNK) {
    const chunk = statements.slice(i, i + CHUNK);
    try {
      await db.batch(chunk.map((s) => db.prepare(s)));
      done += chunk.length;
    } catch (err) {
      const failure = await locate(db, chunk, err);
      done += failure.committed;
      // The batch was rejected but every statement in it passed on its own.
      // The chunk is applied; the batch call was the problem, not the SQL.
      if (failure.statement === null && failure.committed === chunk.length) continue;
      return {
        ok: false,
        done,
        failure: {
          statement: failure.statement,
          error: failure.error,
          statementNumber: done + 1,
          of: statements.length,
        },
      };
    }
  }

  return { ok: true, done, failure: null };
}

// The failed chunk applied nothing, so replaying it statement by statement is
// safe and tells us exactly which one D1 rejected.
async function locate(db, chunk, batchErr) {
  let committed = 0;
  for (const s of chunk) {
    try {
      await db.prepare(s).run();
      committed += 1;
    } catch (err) {
      return { committed, statement: s, error: err.message };
    }
  }
  // The batch failed but every statement passed on its own — a limit or a shape
  // db.batch() will not take rather than bad SQL. The caller carries on: the
  // statements are committed, which is what the run was for.
  return { committed, statement: null, error: `batch of ${chunk.length} failed: ${batchErr.message}` };
}

// Applies every pending migration in order and halts on the first failure.
//
// A migration that halts part-way is not recorded, so it stays pending. Its
// committed statements are real: fixing it means adding a new file, not editing
// this one. That is the cost of D1 having no cross-batch transaction, and it is
// why 001 is written once and left alone.
export async function applyPending(db, migrations) {
  const status = await migrationStatus(db, migrations);
  const pending = status.filter((r) => r.state === 'pending');
  const applied = [];

  for (const row of pending) {
    const m = migrations.find((x) => x.id === row.id);
    const statements = splitStatements(m.sql);
    const result = await runChunked(db, statements);

    if (!result.ok) {
      return {
        ok: false,
        applied,
        failure: { id: m.id, name: m.name, ...result.failure },
      };
    }

    await db.prepare(
      'INSERT INTO _migrations (id, name, applied_at, checksum) VALUES (?, ?, ?, ?)'
    ).bind(m.id, m.name, new Date().toISOString(), await checksum(m.sql)).run();

    applied.push({ id: m.id, name: m.name, statements: statements.length });
  }

  return { ok: true, applied, failure: null };
}

// Delete order is dependency order, and it is not negotiable: D1 enforces
// foreign keys, so anything else fails half-way and leaves a plan in pieces
// (§3). sessions and media point at plan_tasks; stamps and plan_tasks point at
// month_plans.
const RESET_ORDER = [
  ['sessions', 'DELETE FROM sessions WHERE plan_id = ?'],
  ['media', 'DELETE FROM media WHERE plan_id = ?'],
  ['stamps', 'DELETE FROM stamps WHERE plan_id = ?'],
  ['plan_tasks', 'DELETE FROM plan_tasks WHERE plan_id = ?'],
  ['month_plans', 'DELETE FROM month_plans WHERE id = ?'],
];

export function resetStatements() {
  return RESET_ORDER.map(([table, sql]) => ({ table, sql }));
}

export async function resetMonth(db, planId) {
  const deleted = {};
  for (const { table, sql } of resetStatements()) {
    const res = await db.prepare(sql).bind(planId).run();
    deleted[table] = res.meta?.changes ?? 0;
  }
  return deleted;
}

export const SCHEMA_TABLES = [
  'people', 'countries', 'focuses', 'project_types', 'country_hooks',
  'country_focus_affinity', 'task_templates', 'task_focus_weights',
  'month_plans', 'plan_tasks', 'sessions', 'stamps', 'media',
];

// Erase everything. Drops every table in the database, `_migrations` included,
// which puts the database back to the state it was in before the first Apply
// pending — so the next Apply pending runs 001 again and the next Run seed
// refills it.
//
// This is what makes the schema files editable in place. Append-only exists to
// protect data that cannot be got back; there is none here, so a schema change
// is an edit to 001 followed by three button presses rather than a new file
// carrying an ALTER for every column SQLite will not let a CHECK constraint
// have (§3).
//
// Drop order is discovered rather than declared. D1 enforces foreign keys and
// DROP TABLE does an implicit DELETE, so a parent whose children still exist
// refuses to drop — the loop retries until a pass drops nothing new, which
// takes the tables leaves-first without this file having to know the shape of a
// schema it will outlive.
export async function eraseAll(db) {
  const { results } = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  ).all();

  const remaining = new Set(results.map((r) => r.name));
  const dropped = [];
  let error = null;

  while (remaining.size > 0) {
    let progress = false;
    for (const name of [...remaining]) {
      try {
        // The name comes from sqlite_master, not from the request. Quoted
        // anyway: `_migrations` needs no quoting and a future table might.
        await db.prepare(`DROP TABLE "${name.replace(/"/g, '""')}"`).run();
        remaining.delete(name);
        dropped.push(name);
        progress = true;
      } catch (err) {
        error = err.message;
      }
    }
    if (!progress) break;
  }

  return {
    ok: remaining.size === 0,
    dropped: dropped.sort(),
    remaining: [...remaining].sort(),
    error: remaining.size === 0 ? null : error,
  };
}
