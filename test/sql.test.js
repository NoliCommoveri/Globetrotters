import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { splitStatements, checksum } from '../src/lib/sql.js';

test('a semicolon inside a string literal is not a statement boundary', () => {
  const out = splitStatements("INSERT INTO x VALUES ('a;b');");
  assert.deepEqual(out, ["INSERT INTO x VALUES ('a;b')"]);
});

test('an apostrophe is an escaped quote, not the end of the literal', () => {
  const out = splitStatements(
    "INSERT INTO t (prompt) VALUES ('Ask someone what they''re proud of; write it down');\n"
    + "SELECT 1;",
  );
  assert.equal(out.length, 2);
  assert.match(out[0], /they''re proud of; write it down/);
  assert.equal(out[1], 'SELECT 1');
});

test('probe.sql — the two characters that break a naive splitter', () => {
  const sql = readFileSync(new URL('../src/lib/probe.sql', import.meta.url), 'utf8');
  assert.equal(sql.split(';').length - 1, 2, 'two semicolons, one of them inside a literal');
  assert.equal(splitStatements(sql).length, 1, 'but only one statement');
});

test('comments are not statements', () => {
  const out = splitStatements(`
    -- a leading comment; with a semicolon in it
    /* and a block one; too */
    SELECT 1;
    -- a trailing comment
  `);
  assert.equal(out.length, 1);
  assert.match(out[0], /SELECT 1$/);
});

test('a double-quoted identifier can hold a semicolon', () => {
  const out = splitStatements('CREATE TABLE "odd;name" (id INTEGER); SELECT 2;');
  assert.equal(out.length, 2);
  assert.equal(out[0], 'CREATE TABLE "odd;name" (id INTEGER)');
});

test('a trailing statement with no semicolon still counts', () => {
  assert.deepEqual(splitStatements('SELECT 1'), ['SELECT 1']);
});

test('empty and whitespace-only input yields nothing', () => {
  assert.deepEqual(splitStatements(''), []);
  assert.deepEqual(splitStatements('  \n ;; \n'), []);
});

test('checksum changes when a byte does', async () => {
  const a = await checksum('SELECT 1;');
  const b = await checksum('SELECT 2;');
  assert.equal(a.length, 64);
  assert.notEqual(a, b);
  assert.equal(a, await checksum('SELECT 1;'));
});
