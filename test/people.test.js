// The people editor. Renaming your own kids must never require editing SQL
// (DESIGN.md §3), so this is the endpoint that closes that loop.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FakeD1 } from './d1.js';
import { applyPending } from '../src/lib/migrations.js';
import { runSeed } from '../src/lib/seed.js';
import { apiPeople, apiPatchPerson } from '../src/admin/people.js';

const read = (name) => readFileSync(new URL(`../src/migrations/${name}`, import.meta.url), 'utf8');
const MIGRATIONS = [{ id: '001', name: '001_schema.sql', sql: read('001_schema.sql') }];
const SEEDS = [{ id: '002', name: '002_seed.sql', sql: read('002_seed.sql') }];

async function env() {
  const db = new FakeD1();
  await applyPending(db, MIGRATIONS);
  await runSeed(db, SEEDS);
  return { DB: db };
}

function patch(body) {
  return new Request('https://example.test/admin/api/people/1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('lists the three in their fixed order', async () => {
  const res = await apiPeople(new Request('https://example.test/admin/api/people'), await env());
  const { people } = await res.json();
  assert.equal(people.length, 3);
  assert.deepEqual(people.map((p) => p.sort_order), [1, 2, 3]);
});

test('a rename sticks', async () => {
  const e = await env();
  const res = await apiPatchPerson(patch({ name: '  Rosa  ' }), e, { id: '1' });
  assert.equal(res.status, 200);
  const { person } = await res.json();
  assert.equal(person.name, 'Rosa');

  const row = e.DB.prepare('SELECT name FROM people WHERE id = 1').first();
  assert.equal(row.name, 'Rosa');
});

test('ink is normalized to uppercase hex', async () => {
  const e = await env();
  const { person } = await (await apiPatchPerson(patch({ color: '#5b2a86' }), e, { id: '1' })).json();
  assert.equal(person.color, '#5B2A86');
});

test('a blank name, a short hex and a fractional order are all refused', async () => {
  const e = await env();
  for (const body of [{ name: '   ' }, { color: '#abc' }, { color: 'purple' }, { sort_order: 1.5 }]) {
    const res = await apiPatchPerson(patch(body), e, { id: '1' });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  // Nothing was written by any of them.
  const row = e.DB.prepare('SELECT name, color, sort_order FROM people WHERE id = 1').first();
  assert.equal(row.name, 'Person 1');
});

test('an empty body and a missing person are distinguished', async () => {
  const e = await env();
  assert.equal((await apiPatchPerson(patch({}), e, { id: '1' })).status, 400);
  assert.equal((await apiPatchPerson(patch({ name: 'Nobody' }), e, { id: '99' })).status, 404);
});

test('a name longer than the stamp face is refused', async () => {
  const e = await env();
  const res = await apiPatchPerson(patch({ name: 'x'.repeat(25) }), e, { id: '1' });
  assert.equal(res.status, 400);
});
