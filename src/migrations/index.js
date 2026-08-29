// The two ordered lists, and the only `.sql` imports in the app.
//
// They are separate because they are protected by opposite rules.
//
// MIGRATIONS is schema. Apply order is the array's order, ids are zero-padded
// to three digits so a lexicographic sort agrees with it, each file's checksum
// is recorded when it runs, and an edit afterwards shows on /admin as drift and
// is never reapplied on its own. Erase everything is the way to make an edited
// file run again: it drops the ledger with the tables, so the whole list is
// pending and the database is rebuilt from the files as they now read.
//
// SEEDS is data, and every insert in one is ON CONFLICT DO NOTHING. Run seed
// re-executes the whole list on every press: a row that exists is left alone,
// a row that is new is inserted. That is what lets the library grow to ninety
// task templates on an already-seeded database by editing a file in the
// GitHub web editor — which the checksum rule would forbid, and the browser-only
// constraint (DESIGN.md §3) leaves no other way to do.
//
// The runner in ../lib/migrations.js takes a list as an argument and imports
// nothing wrangler has to bundle specially, which is what lets it be tested
// against a real SQLite outside the Worker.

import m001 from './001_schema.sql';
import s002 from './002_seed.sql';
import s003 from './003_country_data.sql';
import m004 from './004_worksheets.sql';
import s005 from './005_worksheet_layouts.sql';

export const MIGRATIONS = [
  { id: '001', name: '001_schema.sql', sql: m001 },
  { id: '004', name: '004_worksheets.sql', sql: m004 },
];

export const SEEDS = [
  { id: '002', name: '002_seed.sql', sql: s002 },
  { id: '003', name: '003_country_data.sql', sql: s003 },
  { id: '005', name: '005_worksheet_layouts.sql', sql: s005 },
];
