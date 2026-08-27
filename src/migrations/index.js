// The two ordered lists, and the only `.sql` imports in the app.
//
// They are separate because they are protected by opposite rules.
//
// MIGRATIONS is schema. Apply order is the array's order, ids are zero-padded
// to three digits so a lexicographic sort agrees with it, each file's checksum
// is recorded when it runs, and an edit afterwards shows on /admin as drift.
// A file here is written once and never touched again.
//
// SEEDS is data, and every insert in one is ON CONFLICT DO NOTHING. Run seed
// re-executes the whole list on every press: a row that exists is left alone,
// a row that is new is inserted. That is what makes slice 09 able to add
// ninety task templates to an already-seeded database by editing a file in the
// GitHub web editor — which the checksum rule would forbid, and the browser-only
// constraint (DESIGN.md §3) leaves no other way to do.
//
// The runner in ../lib/migrations.js takes a list as an argument and imports
// nothing wrangler has to bundle specially, which is what lets it be tested
// against a real SQLite outside the Worker.

import m001 from './001_schema.sql';
import s002 from './002_seed.sql';

export const MIGRATIONS = [
  { id: '001', name: '001_schema.sql', sql: m001 },
];

export const SEEDS = [
  { id: '002', name: '002_seed.sql', sql: s002 },
];
