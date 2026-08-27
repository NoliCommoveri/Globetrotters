// The wall tablet's routes and its read-only gate (DESIGN.md §6, §8).
//
// Two things are worth asserting here and they are the two the slice calls
// exit criteria. The first is the gate: "no checkboxes anywhere" is a layout
// decision, and what makes the tablet in the room guests stand in safe is that
// a wall cookie is refused on every write route in the app — including ones
// slices 08 and 10 have not added yet.
//
// The second is the heartbeat's value. It has to move when an undo moves it
// backwards, because the wall compares for inequality and a `>` comparison
// there leaves the kitchen showing a stale screen until the next stamp (Q-09).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith('.sql')) return nextLoad(url, context);
    const text = readFileSync(new URL(url), 'utf8');
    return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(text)};` };
  },
});

const { FakeD1 } = await import('./d1.js');
const worker = (await import('../src/index.js')).default;
const { applyPending } = await import('../src/lib/migrations.js');
const { MIGRATIONS, SEEDS } = await import('../src/migrations/index.js');
const { runSeed } = await import('../src/lib/seed.js');
const { issueSessionCookie, issueWallCookie } = await import('../src/lib/auth.js');

const ADMIN_TOKEN = 'test-token';
const FAMILY_PASSCODE = 'wanderlust';

async function env() {
  const DB = new FakeD1();
  await applyPending(DB, MIGRATIONS);
  const e = { DB, ADMIN_TOKEN, FAMILY_PASSCODE, FAMILY_TZ: 'America/Chicago' };
  await runSeed(DB, SEEDS);
  return e;
}

const strip = (cookie) => cookie.split(';')[0];

async function fetchAs(e, cookie, path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (cookie) headers.cookie = cookie;
  if (init.body) headers['content-type'] = 'application/json';
  const res = await worker.fetch(new Request(`https://example.test${path}`, {
    ...init,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  }), e);
  return { res, body: await res.json().catch(() => null) };
}

const asWall = async (e, path, init) => fetchAs(e, strip(await issueWallCookie(e)), path, init);

const asPerson = async (e, personId, path, init) =>
  fetchAs(e, strip(await issueSessionCookie(e, personId)), path, init);

const futureSeptember = () => `${new Date().getUTCFullYear() + 2}-09`;

async function plan(e, personId = 1, month = futureSeptember(), overrides = {}) {
  const { body } = await asPerson(e, personId, '/api/plans', {
    method: 'POST',
    body: { month, country_id: 1, focus_id: 1, project_type_id: 1, ...overrides },
  });
  return body;
}

const tasksOf = (body) => body.weeks.flatMap((w) => w.tasks);

async function finish(e, personId, body) {
  let latest = body;
  for (const task of tasksOf(body)) {
    ({ body: latest } = await asPerson(e, personId, `/api/tasks/${task.id}`, {
      method: 'PATCH', body: { status: 'done' },
    }));
  }
  return latest;
}

// ------------------------------------------------------------------ gate --

// The exit criterion, and the reason the wall has its own cookie type at all.
// The list is every route the family gate answers plus the id routes behind it:
// if a later slice adds one and does not add it here, the allowlist in
// src/index.js is what refuses it, which is the point of an allowlist.
test('every write route refuses a wall cookie, and POST /api/auth does not', async () => {
  const e = await env();

  for (const [method, path] of [
    ['PATCH', '/api/me'],
    ['POST', '/api/plans'],
    ['POST', '/api/sessions'],
    ['PATCH', '/api/tasks/1'],
    ['POST', '/api/tasks/1/swap'],
    ['PATCH', '/api/plans/1'],
    ['POST', '/api/plans/1/redraw'],
    ['POST', '/api/plans/1/complete'],
    ['DELETE', '/api/plans/1/complete'],
    ['PATCH', '/api/stamps/1'],
  ]) {
    const { res, body } = await asWall(e, path, { method });
    assert.equal(res.status, 403, `${method} ${path}`);
    assert.match(body.error, /read-only/i);
  }

  // The one exemption (Q-10). A tablet whose year ran out has no other way back
  // in, and the most this route can hand it is another wall cookie.
  const { res, body } = await asWall(e, '/api/auth', {
    method: 'POST', body: { passcode: FAMILY_PASSCODE, wall: true },
  });
  assert.equal(res.status, 200);
  assert.equal(body.wall, true);
  assert.match(res.headers.get('set-cookie'), /gt_wall=/);
});

// Not only the writes. The wall has no person and no business with /api/me or
// the catalog, and naming the two routes it does need is what a later slice
// cannot widen by forgetting.
test('a wall cookie reaches the two wall routes and nothing else', async () => {
  const e = await env();

  assert.equal((await asWall(e, '/api/wall')).res.status, 200);
  assert.equal((await asWall(e, '/api/wall/version')).res.status, 200);

  for (const path of ['/api/me', '/api/catalog', '/api/passport', '/api/stats']) {
    assert.equal((await asWall(e, path)).res.status, 403, path);
  }
});

test('the wall passcode issues a cookie that is not the family one', async () => {
  const e = await env();

  const wall = await fetchAs(e, null, '/api/auth', {
    method: 'POST', body: { passcode: FAMILY_PASSCODE, wall: true },
  });
  const cookie = wall.res.headers.get('set-cookie');
  assert.match(cookie, /gt_wall=/);
  assert.doesNotMatch(cookie, /gt_session=/);

  // That cookie is refused everywhere the family's is not.
  assert.equal((await fetchAs(e, strip(cookie), '/api/me')).res.status, 403);

  // And the same passcode without the flag still issues the family's.
  const family = await fetchAs(e, null, '/api/auth', {
    method: 'POST', body: { passcode: FAMILY_PASSCODE },
  });
  assert.match(family.res.headers.get('set-cookie'), /gt_session=/);
});

test('a wrong passcode does not issue a wall cookie either', async () => {
  const e = await env();
  const { res } = await fetchAs(e, null, '/api/auth', {
    method: 'POST', body: { passcode: 'nope', wall: true },
  });
  assert.equal(res.status, 401);
  assert.doesNotMatch(res.headers.get('set-cookie'), /gt_wall=/);
});

// The reboot the long-lived cookie exists to survive. The year slides forward on
// every wall response for the same reason it does on every family one.
test('every wall response slides the wall cookie forward', async () => {
  const e = await env();
  const { res } = await asWall(e, '/api/wall/version');
  assert.match(res.headers.get('set-cookie'), /gt_wall=.*Max-Age=31536000/);
});

// A parent checking the kitchen screen from their own phone is holding a family
// cookie, not a wall one, and must not be sent to a passcode form for it.
test('a family cookie reads the wall routes too', async () => {
  const e = await env();
  assert.equal((await asPerson(e, 1, '/api/wall')).res.status, 200);
  assert.equal((await asPerson(e, 1, '/api/wall/version')).res.status, 200);
});

test('no cookie at all is still 401, not 403', async () => {
  const e = await env();
  assert.equal((await fetchAs(e, null, '/api/wall')).res.status, 401);
});

// ------------------------------------------------------------- heartbeat --

// Q-09. Undo nulls `completed_at` and un-completing deletes the stamp row, so
// both halves of this value can move backwards. What the client must never do
// is compare with `>`; what this asserts is that the value moves at all.
test('the version moves on a check-off and moves back on an undo', async () => {
  const e = await env();
  const p = await plan(e);
  const [first] = tasksOf(p);

  const empty = (await asWall(e, '/api/wall/version')).body.version;
  assert.equal(empty, '/');

  await asPerson(e, 1, `/api/tasks/${first.id}`, { method: 'PATCH', body: { status: 'done' } });
  const done = (await asWall(e, '/api/wall/version')).body.version;
  assert.notEqual(done, empty);

  await asPerson(e, 1, `/api/tasks/${first.id}`, { method: 'PATCH', body: { status: 'open' } });
  const undone = (await asWall(e, '/api/wall/version')).body.version;
  assert.notEqual(undone, done);
  assert.equal(undone, empty);
});

test('the version moves when a stamp is earned and again when it is removed', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);

  const before = (await asWall(e, '/api/wall/version')).body.version;
  await asPerson(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });
  const stamped = (await asWall(e, '/api/wall/version')).body.version;
  assert.notEqual(stamped, before);

  await asPerson(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'DELETE' });
  const removed = (await asWall(e, '/api/wall/version')).body.version;
  assert.notEqual(removed, stamped);
});

// --------------------------------------------------------------- payload --

test('the empty wall is three columns, nine months and no stamps', async () => {
  const e = await env();
  const { body } = await asWall(e, '/api/wall');

  assert.equal(body.stamp_count, 0);
  assert.equal(body.people.length, 3);
  assert.equal(body.columns.length, 3);
  assert.equal(body.months.length, 9);
  assert.deepEqual(body.columns.map((c) => c.plan), [null, null, null]);
});

test('a column carries the country, the focus and the week ring', async () => {
  const e = await env();
  const p = await plan(e, 1, futureSeptember());
  const [first] = tasksOf(p);
  await asPerson(e, 1, `/api/tasks/${first.id}`, { method: 'PATCH', body: { status: 'done' } });

  const { body } = await asWall(e, '/api/wall');
  const mine = body.columns.find((c) => c.person_id === 1).plan;

  assert.equal(mine.country_name, p.plan.country_name);
  assert.equal(mine.focus_name, p.plan.focus_name);
  assert.equal(mine.week_total, 5);
  assert.equal(mine.week_done, 1);
  assert.equal(mine.status, 'active');
});

// The rule, asserted as a property of the payload rather than of the markup.
// A number that is not in the response cannot be rendered by a later change to
// the client that forgot why (§8).
test('nothing in the payload lets you compare two people’s totals', async () => {
  const e = await env();
  await plan(e, 1);
  await plan(e, 2);

  const { body } = await asWall(e, '/api/wall');
  const json = JSON.stringify(body);

  for (const key of ['done_count', 'total', 'tasks_done', 'days_worked', 'percent']) {
    assert.equal(json.includes(`"${key}"`), false, key);
  }
  for (const column of body.columns) {
    if (!column.plan) continue;
    // The week ring and nothing else. Five is a week; twenty is the month.
    assert.ok(column.plan.week_total <= 5);
  }
});

// Fixed display order, never sorted by progress. One person finishing a month
// must not move them to the front of the wall.
test('columns stay in people.sort_order however far ahead anyone is', async () => {
  const e = await env();
  const third = await plan(e, 3);
  await finish(e, 3, third);
  await asPerson(e, 3, `/api/plans/${third.plan.id}/complete`, { method: 'POST' });
  await plan(e, 1);

  const { body } = await asWall(e, '/api/wall');
  assert.deepEqual(body.columns.map((c) => c.person_id), body.people.map((p) => p.id));
  assert.deepEqual(body.people.map((p) => p.sort_order), [...body.people.map((p) => p.sort_order)].sort());
});

test('a stamped month shows as stamped rather than as a week the calendar walked past', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);
  await asPerson(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });

  const { body } = await asWall(e, '/api/wall');
  const mine = body.columns.find((c) => c.person_id === 1).plan;
  assert.equal(mine.status, 'complete');
  assert.equal(mine.week_done, mine.week_total);
  assert.equal(body.stamp_count, 1);

  // And the stamp is on the grid, carrying what the replay needs to draw a face.
  const [stamp] = body.stamps;
  assert.equal(stamp.person_id, 1);
  assert.ok(stamp.earned_at);
  assert.ok(stamp.country_name);
  assert.ok(stamp.focus_name);
});

// --------------------------------------------------------------- the page --

test('/wall serves its own document, not the shell', async () => {
  const e = await env();
  e.ASSETS = {
    fetch: (request) => new Response('<!doctype html>', {
      headers: { 'x-asset': new URL(request.url).pathname },
    }),
  };
  const res = await worker.fetch(new Request('https://example.test/wall'), e);
  assert.equal(res.headers.get('x-asset'), '/wall.html');

  const shell = await worker.fetch(new Request('https://example.test/passport'), e);
  assert.equal(shell.headers.get('x-asset'), '/index.html');
});
