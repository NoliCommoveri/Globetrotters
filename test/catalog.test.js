// GET /api/catalog — the one fetch setup makes, and the ETag that lets a
// corrected hook reach a device that already cached it (Q-05).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FakeD1 } from './d1.js';
import { applyPending } from '../src/lib/migrations.js';
import { runSeed } from '../src/lib/seed.js';
import { apiCatalog } from '../src/api/catalog.js';

const read = (name) => readFileSync(new URL(`../src/migrations/${name}`, import.meta.url), 'utf8');
const MIGRATIONS = [{ id: '001', name: '001_schema.sql', sql: read('001_schema.sql') }];
const SEEDS = [{ id: '002', name: '002_seed.sql', sql: read('002_seed.sql') }];

async function env() {
  const db = new FakeD1();
  await applyPending(db, MIGRATIONS);
  await runSeed(db, SEEDS);
  return { DB: db };
}

const get = (headers = {}) => new Request('https://example.test/api/catalog', { headers });

test('carries the five lists setup needs', async () => {
  const res = await apiCatalog(get(), await env());
  assert.equal(res.status, 200);
  const body = await res.json();
  for (const key of ['countries', 'focuses', 'project_types', 'hooks', 'affinities']) {
    assert.ok(Array.isArray(body[key]), `${key} missing`);
  }
  assert.equal(body.focuses.length, 6);
  assert.equal(body.project_types.length, 6);
});

test('each project type reports how much of week 4 it has', async () => {
  const res = await apiCatalog(get(), await env());
  const { project_types: types } = await res.json();
  // Setup hides a type with none: a month that ends in five blank cards is
  // worse than a type that is not offered yet.
  for (const t of types) assert.equal(typeof t.week4_templates, 'number');
  const trifold = types.find((t) => t.slug === 'trifold-board');
  assert.ok(trifold, 'trifold-board missing');
});

test('a second fetch with the ETag gets a 304 and no body', async () => {
  const e = await env();
  const first = await apiCatalog(get(), e);
  const etag = first.headers.get('etag');
  assert.match(etag, /^"[0-9a-f]{16}"$/);
  assert.equal(first.headers.get('cache-control'), 'no-cache');

  const second = await apiCatalog(get({ 'if-none-match': etag }), e);
  assert.equal(second.status, 304);
  assert.equal(await second.text(), '');
  assert.equal(second.headers.get('etag'), etag);
});

test('a weak or listed ETag still matches', async () => {
  const e = await env();
  const etag = (await apiCatalog(get(), e)).headers.get('etag');
  const weak = await apiCatalog(get({ 'if-none-match': `W/${etag}` }), e);
  assert.equal(weak.status, 304);
  const listed = await apiCatalog(get({ 'if-none-match': `"0000000000000000", ${etag}` }), e);
  assert.equal(listed.status, 304);
});

test('an edited row changes the ETag', async () => {
  const e = await env();
  const before = (await apiCatalog(get(), e)).headers.get('etag');
  e.DB.prepare("UPDATE focuses SET blurb = 'Something else entirely.' WHERE slug = 'wild-places'").run();
  const after = (await apiCatalog(get(), e)).headers.get('etag');
  assert.notEqual(before, after);

  // And the device holding the old tag is told to take the new body.
  const stale = await apiCatalog(get({ 'if-none-match': before }), e);
  assert.equal(stale.status, 200);
});

test('the payload stays within its size budget', async () => {
  const res = await apiCatalog(get(), await env());
  const bytes = new TextEncoder().encode(await res.text()).length;
  // §6 budgets ~60KB with all 195 countries, hooks and affinities loaded.
  // 100KB is the point at which the single-fetch decision needs revisiting.
  assert.ok(bytes < 100_000, `catalog is ${bytes} bytes`);
});
