// Routing, end to end through the real Worker entry.
//
// src/index.js is the one module the unit tests cannot import: it pulls in the
// `.sql` text bundles, which exist only inside wrangler. A module hook supplies
// them the way wrangler does, which is what makes a wrong import path or a
// route wired to the wrong handler fail here rather than on the deployed
// Worker.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith('.sql')) return nextLoad(url, context);
    const text = readFileSync(new URL(url), 'utf8');
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(text)};`,
    };
  },
});

const { FakeD1 } = await import('./d1.js');
const worker = (await import('../src/index.js')).default;
const { applyPending } = await import('../src/lib/migrations.js');
const { MIGRATIONS } = await import('../src/migrations/index.js');
const { issueAdminCookie } = await import('../src/lib/auth.js');

const ADMIN_TOKEN = 'test-token';

async function env() {
  const DB = new FakeD1();
  await applyPending(DB, MIGRATIONS);
  return { DB, ADMIN_TOKEN };
}

const get = (path, headers = {}) => new Request(`https://example.test${path}`, { headers });

async function asAdmin(e, path, init = {}) {
  const cookie = (await issueAdminCookie(e)).split(';')[0];
  return worker.fetch(new Request(`https://example.test${path}`, {
    ...init,
    headers: { ...(init.headers || {}), cookie },
  }), e);
}

test('an unknown path is 404 and a known one with the wrong method is 405', async () => {
  const e = await env();
  assert.equal((await worker.fetch(get('/nope'), e)).status, 404);
  assert.equal((await worker.fetch(get('/api/nope'), e)).status, 404);
  const post = new Request('https://example.test/api/catalog', { method: 'POST' });
  assert.equal((await worker.fetch(post, e)).status, 405);
});

test('the catalog is served without an admin cookie', async () => {
  const res = await worker.fetch(get('/api/catalog'), await env());
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('etag'));
});

test('every /admin/api route refuses an unsigned request with JSON, not a form', async () => {
  const e = await env();
  for (const [method, path] of [
    ['POST', '/admin/api/seed'],
    ['GET', '/admin/api/people'],
    ['PATCH', '/admin/api/people/1'],
  ]) {
    const res = await worker.fetch(
      new Request(`https://example.test${path}`, { method }), e,
    );
    assert.equal(res.status, 401, `${method} ${path}`);
    assert.match(res.headers.get('content-type'), /json/);
  }
});

test('Run seed and the people editor are reachable with the cookie', async () => {
  const e = await env();

  const seeded = await asAdmin(e, '/admin/api/seed', { method: 'POST' });
  assert.equal(seeded.status, 200);
  assert.equal((await seeded.json()).inserted.people.inserted, 3);

  const listed = await asAdmin(e, '/admin/api/people');
  assert.equal((await listed.json()).people.length, 3);

  const renamed = await asAdmin(e, '/admin/api/people/2', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Juno' }),
  });
  assert.equal(renamed.status, 200);
  assert.equal((await renamed.json()).person.name, 'Juno');
});

test('an id route reached with the wrong method is 405, not 404', async () => {
  const e = await env();
  const res = await asAdmin(e, '/admin/api/people/1', { method: 'DELETE' });
  assert.equal(res.status, 405);
});

test('the admin page renders the seeded people', async () => {
  const e = await env();
  await asAdmin(e, '/admin/api/seed', { method: 'POST' });
  const res = await asAdmin(e, '/admin');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Run seed/);
  assert.match(html, /type="color"/);
  assert.match(html, /#5B2A86/i);
});
