// Routing, end to end through the real Worker entry.
//
// src/index.js is the one module the unit tests cannot import: it pulls in the
// `.sql` text bundles, which exist only inside wrangler. A module hook supplies
// them the way wrangler does, which is what makes a wrong import path or a
// route wired to the wrong handler fail here rather than on the deployed
// Worker.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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
const { issueAdminCookie, issueSessionCookie } = await import('../src/lib/auth.js');

const ADMIN_TOKEN = 'test-token';
const FAMILY_PASSCODE = 'wanderlust';

// The Worker's own asset binding, stubbed. It is what serves the shell document
// for a client route the assets directory has no file for.
const ASSETS = {
  fetch: (request) => new Response('<!doctype html><title>Globetrotters</title>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-asset': new URL(request.url).pathname },
  }),
};

async function env({ seeded = false } = {}) {
  const DB = new FakeD1();
  await applyPending(DB, MIGRATIONS);
  const e = { DB, ADMIN_TOKEN, FAMILY_PASSCODE, ASSETS };
  if (seeded) await asAdmin(e, '/admin/api/seed', { method: 'POST' });
  return e;
}

const get = (path, headers = {}) => new Request(`https://example.test${path}`, { headers });

// A device that has typed the passcode but not yet picked a person — the state
// every family route is reached in at least once.
async function session(e) {
  return { cookie: (await issueSessionCookie(e, null)).split(';')[0] };
}

const postJson = (e, path, body) => worker.fetch(new Request(`https://example.test${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
}), e);

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
  const post = new Request('https://example.test/api/catalog', {
    method: 'POST', headers: await session(e),
  });
  assert.equal((await worker.fetch(post, e)).status, 405);
});

// The gate sits in front of the family table rather than inside each handler,
// so this test is the one that fails when a route added in a later slice is
// wired up without it.
test('every family route refuses a request with no session cookie', async () => {
  const e = await env();
  for (const [method, path] of [
    ['GET', '/api/me'],
    ['PATCH', '/api/me'],
    ['GET', '/api/catalog'],
    ['GET', '/api/stats'],
    ['POST', '/api/sessions'],
    ['PATCH', '/api/tasks/1'],
    ['POST', '/api/tasks/1/swap'],
  ]) {
    const res = await worker.fetch(
      new Request(`https://example.test${path}`, { method }), e,
    );
    assert.equal(res.status, 401, `${method} ${path}`);
    assert.match(res.headers.get('content-type'), /json/);
  }
});

// 401 before 404. Which family routes exist is not something an
// unauthenticated request gets to map.
test('a route that does not exist is 401 too, until you are signed in', async () => {
  const e = await env();
  assert.equal((await worker.fetch(get('/api/nothing-here'), e)).status, 401);
  assert.equal((await worker.fetch(get('/api/nothing-here', await session(e)), e)).status, 404);
});

test('the passcode is the one family route that answers without a cookie', async () => {
  const e = await env();

  const wrong = await postJson(e, '/api/auth', { passcode: 'nope' });
  assert.equal(wrong.status, 401);
  assert.match(wrong.headers.get('set-cookie'), /gt_session=; .*Max-Age=0/);

  const right = await postJson(e, '/api/auth', { passcode: FAMILY_PASSCODE });
  assert.equal(right.status, 200);
  const cookie = right.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Path=\/(;|$)/);

  // The passcode says the device belongs to the family. It does not say who is
  // holding it.
  const me = await worker.fetch(get('/api/me', { cookie: cookie.split(';')[0] }), e);
  assert.equal((await me.json()).person_id, null);
});

test('a deploy missing FAMILY_PASSCODE says so instead of rejecting everyone', async () => {
  const e = await env();
  delete e.FAMILY_PASSCODE;
  const res = await postJson(e, '/api/auth', { passcode: 'anything' });
  assert.equal(res.status, 500);
  assert.match((await res.json()).error, /FAMILY_PASSCODE/);
});

test('the catalog is served to a signed-in device, with its ETag intact', async () => {
  const e = await env();
  const res = await worker.fetch(get('/api/catalog', await session(e)), e);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('etag'));

  // A 304 still carries a refreshed cookie: revalidating the catalog is an
  // authenticated request like any other, and it is the one a returning device
  // makes first.
  const again = await worker.fetch(
    get('/api/catalog', { ...(await session(e)), 'if-none-match': res.headers.get('etag') }), e,
  );
  assert.equal(again.status, 304);
  assert.match(again.headers.get('set-cookie'), /gt_session=/);
});

test('picking a person writes it into the cookie and /api/me reads it back', async () => {
  const e = await env({ seeded: true });
  const cookie = await session(e);

  const picked = await worker.fetch(new Request('https://example.test/api/me', {
    method: 'PATCH',
    headers: { ...cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ person_id: 2 }),
  }), e);
  assert.equal(picked.status, 200);

  // Exactly one cookie on the response: re-issuing on top of the handler's own
  // would append a second Set-Cookie carrying the identity it just replaced.
  const set = picked.headers.getSetCookie();
  assert.equal(set.length, 1);

  const me = await worker.fetch(get('/api/me', { cookie: set[0].split(';')[0] }), e);
  const body = await me.json();
  assert.equal(body.person_id, 2);
  assert.equal(body.people.length, 3);
  assert.deepEqual(body.plans, []);
});

test('a person id that names nobody sends the device back to the picker', async () => {
  const e = await env({ seeded: true });
  const stale = (await issueSessionCookie(e, 99)).split(';')[0];
  const me = await worker.fetch(get('/api/me', { cookie: stale }), e);
  assert.equal(me.status, 200);
  assert.equal((await me.json()).person_id, null);
});

test('picking someone who does not exist is refused and changes nothing', async () => {
  const e = await env({ seeded: true });
  const res = await worker.fetch(new Request('https://example.test/api/me', {
    method: 'PATCH',
    headers: { ...(await session(e)), 'content-type': 'application/json' },
    body: JSON.stringify({ person_id: 99 }),
  }), e);
  assert.equal(res.status, 404);
});

test('every authenticated response slides the year forward', async () => {
  const e = await env({ seeded: true });
  const res = await worker.fetch(get('/api/me', await session(e)), e);
  assert.match(res.headers.get('set-cookie'), /Max-Age=31536000/);
});

test('the shell document is served for a client route with no file behind it', async () => {
  const e = await env();
  const res = await worker.fetch(get('/settings'), e);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-asset'), '/index.html');

  // Not a catch-all: a mistyped fetch has to 404 rather than come back as HTML
  // the client then fails to parse as JSON.
  assert.equal((await worker.fetch(get('/week'), e)).status, 404);
});

test('every /admin/api route refuses an unsigned request with JSON, not a form', async () => {
  const e = await env();
  for (const [method, path] of [
    ['POST', '/admin/api/seed'],
    ['GET', '/admin/api/people'],
    ['PATCH', '/admin/api/people/1'],
    ['GET', '/admin/api/library'],
    ['GET', '/admin/api/library.json'],
    ['POST', '/admin/api/library.json'],
    ['POST', '/admin/api/tasks'],
    ['PATCH', '/admin/api/tasks/1'],
    ['POST', '/admin/api/focuses'],
    ['PATCH', '/admin/api/focuses/1'],
    ['PUT', '/admin/api/focuses/1/weights'],
    ['POST', '/admin/api/project-types'],
    ['PATCH', '/admin/api/project-types/1'],
    ['GET', '/admin/api/countries/1'],
    ['POST', '/admin/api/countries/1/hooks'],
    ['PUT', '/admin/api/countries/1/affinities'],
    ['PATCH', '/admin/api/hooks/1'],
    ['DELETE', '/admin/api/hooks/1'],
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

test('the library editor answers on every one of its routes', async () => {
  const e = await env({ seeded: true });

  const page = await asAdmin(e, '/admin/library');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Library/);
  assert.match(html, /admin\/api\/library/);

  const library = await asAdmin(e, '/admin/api/library');
  assert.equal(library.status, 200);
  const data = await library.json();
  assert.equal(data.tasks.length, 37);
  assert.equal(data.focuses.length, 6);

  const json = (path, method, body) => asAdmin(e, path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const made = await json('/admin/api/tasks', 'POST', {
    title: 'Count the coins', prompt: 'Draw one coin.', week_theme: 2, tier: 'wild',
  });
  assert.equal(made.status, 201);
  const taskId = (await made.json()).task.id;

  assert.equal((await json(`/admin/api/tasks/${taskId}`, 'PATCH', { archived: 1 })).status, 200);
  assert.equal((await json('/admin/api/focuses', 'POST', { name: 'Money' })).status, 201);
  assert.equal((await json('/admin/api/focuses/1', 'PATCH', { blurb: 'Edited.' })).status, 200);
  assert.equal((await json('/admin/api/focuses/1/weights', 'PUT', { weights: [] })).status, 200);
  assert.equal((await json('/admin/api/project-types', 'POST', { name: 'Board game' })).status, 201);
  assert.equal((await json('/admin/api/project-types/1', 'PATCH', { name: 'Trifold' })).status, 200);
  assert.equal((await asAdmin(e, '/admin/api/countries/1')).status, 200);

  const hooked = await json('/admin/api/countries/1/hooks', 'POST', { text: 'A lead.' });
  assert.equal(hooked.status, 201);
  const hookId = (await hooked.json()).hooks[0].id;
  assert.equal((await json(`/admin/api/hooks/${hookId}`, 'PATCH', { text: 'A better lead.' })).status, 200);
  assert.equal((await json(`/admin/api/hooks/${hookId}`, 'DELETE')).status, 200);
  assert.equal((await json('/admin/api/countries/1/affinities', 'PUT', { affinities: [] })).status, 200);

  const backup = await asAdmin(e, '/admin/api/library.json');
  assert.equal(backup.status, 200);
  const restored = await json('/admin/api/library.json', 'POST', await backup.json());
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).changed, false);
});

// The threat model is a curious 12-year-old on a shared laptop, so the defense
// is not cryptographic: it is that no link exists. The admin page may link to
// the library; nothing the kids can reach may link to either.
test('nothing the kids can reach links to /admin', async () => {
  const e = await env({ seeded: true });
  const admin = await (await asAdmin(e, '/admin')).text();
  assert.match(admin, /href="\/admin\/library"/);

  // A path inside a string literal is a link or a fetch. The word in a comment
  // is neither, and two of them are load-bearing prose.
  const linked = /["'`][^"'`\n]*\/admin/;
  const files = ['index.html', 'wall.html', 'css/app.css']
    .concat(readdirSync(new URL('../public/js', import.meta.url)).map((n) => `js/${n}`));
  for (const file of files) {
    const text = readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, linked, file);
  }
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
