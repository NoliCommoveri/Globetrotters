// A D1-shaped wrapper over node:sqlite, so the migration runner can be tested
// against a real SQLite engine without a terminal command the owner would never
// be able to run in production.
//
// It matches D1 on the two behaviors the runner depends on: foreign keys are
// enforced, and batch() is atomic — a batch that fails applies nothing.

import { DatabaseSync } from 'node:sqlite';

class Prepared {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  run() {
    const stmt = this.db.prepare(this.sql);
    const info = stmt.run(...this.args);
    return { meta: { changes: Number(info.changes ?? 0) } };
  }

  all() {
    return { results: this.db.prepare(this.sql).all(...this.args) };
  }

  first() {
    return this.db.prepare(this.sql).get(...this.args) ?? null;
  }
}

export class FakeD1 {
  constructor() {
    this.db = new DatabaseSync(':memory:');
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  prepare(sql) {
    return new Prepared(this.db, sql);
  }

  batch(statements) {
    this.db.exec('BEGIN');
    try {
      const out = statements.map((s) => s.run());
      this.db.exec('COMMIT');
      return out;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}
