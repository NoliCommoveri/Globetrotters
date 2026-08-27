// The migration list. Apply order is this array's order, and ids are zero-padded
// to three digits so a lexicographic sort agrees with it — add new files at the
// end and keep both true at once.
//
// This module exists to hold the only `.sql` imports in the app. The runner in
// ../lib/migrations.js takes this array as an argument and imports nothing that
// wrangler has to bundle specially, which is what lets it be tested against a
// real SQLite outside the Worker.

import m001 from './001_schema.sql';

export const MIGRATIONS = [
  { id: '001', name: '001_schema.sql', sql: m001 },
];
