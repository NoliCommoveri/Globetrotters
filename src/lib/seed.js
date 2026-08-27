// Run seed. Idempotent by construction: every insert in a seed file is
// ON CONFLICT DO NOTHING, so the second press inserts nothing and changes
// nothing (DESIGN.md §3).
//
// Not part of the migration list, and the difference matters. A migration is
// checksummed and refuses to re-run; a seed grows — slice 09 adds ~63 task
// templates and 003_country_data.sql to a database that is already seeded and
// already carries a month of real work. Under the checksum rule that edit would
// read as drift forever. Under this one it is a file edit in the GitHub web
// editor and a button press, which is the only shape the browser-only
// constraint leaves.

import { splitStatements } from './sql.js';
import { runChunked } from './migrations.js';

// Counted before and after so the page can say what a press actually did. These
// are the tables a seed file writes; a delta of zero across all of them is the
// expected result of every press after the first.
export const SEEDED_TABLES = [
  'people', 'focuses', 'project_types', 'countries',
  'task_templates', 'task_focus_weights', 'country_hooks', 'country_focus_affinity',
];

async function counts(db) {
  const out = {};
  for (const table of SEEDED_TABLES) {
    try {
      const row = await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first();
      out[table] = Number(row?.n ?? 0);
    } catch {
      // The table does not exist: the schema has not been applied yet. Reported
      // as a missing table rather than as a count, because pressing Run seed
      // before Apply pending is a mistake the page should name.
      out[table] = null;
    }
  }
  return out;
}

export async function runSeed(db, seeds) {
  const before = await counts(db);
  if (Object.values(before).every((n) => n === null)) {
    return { ok: false, error: 'No schema yet — apply the migrations first.', files: [], inserted: {} };
  }

  const files = [];
  for (const seed of seeds) {
    const statements = splitStatements(seed.sql);
    const result = await runChunked(db, statements);
    files.push({
      id: seed.id,
      name: seed.name,
      statements: statements.length,
      ran: result.done,
    });
    if (!result.ok) {
      const after = await counts(db);
      return {
        ok: false,
        files,
        inserted: delta(before, after),
        failure: { id: seed.id, name: seed.name, ...result.failure },
      };
    }
  }

  return { ok: true, files, inserted: delta(before, await counts(db)), failure: null };
}

function delta(before, after) {
  const out = {};
  for (const table of SEEDED_TABLES) {
    if (before[table] === null && after[table] === null) continue;
    out[table] = { rows: after[table] ?? 0, inserted: (after[table] ?? 0) - (before[table] ?? 0) };
  }
  return out;
}
