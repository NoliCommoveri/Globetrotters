// Completion, the stamp, and the passport (DESIGN.md §6, §7 Passport).
//
// The gate is the whole feature. A stamp that can be earned at 19 of 20, or
// twice, or on a plan that has already been stamped, is not an artifact — so
// most of what is asserted here is what the two completion routes refuse.
//
// The other half is that a stamp is frozen. person, country and focus are
// denormalized at the moment it is written, and changing the plan afterwards
// must not rewrite what the passport says about a month that is already over.

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
const { issueSessionCookie } = await import('../src/lib/auth.js');

const ADMIN_TOKEN = 'test-token';

async function env() {
  const DB = new FakeD1();
  await applyPending(DB, MIGRATIONS);
  const e = { DB, ADMIN_TOKEN, FAMILY_PASSCODE: 'wanderlust', FAMILY_TZ: 'America/Chicago' };
  await runSeed(DB, SEEDS);
  return e;
}

async function call(e, personId, path, init = {}) {
  const cookie = (await issueSessionCookie(e, personId)).split(';')[0];
  const headers = { cookie, ...(init.headers || {}) };
  if (init.body) headers['content-type'] = 'application/json';
  const res = await worker.fetch(new Request(`https://example.test${path}`, {
    ...init,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  }), e);
  return { res, body: await res.json() };
}

const futureSeptember = () => `${new Date().getUTCFullYear() + 2}-09`;

async function plan(e, personId = 1, month = futureSeptember(), overrides = {}) {
  const { body } = await call(e, personId, '/api/plans', {
    method: 'POST',
    body: { month, country_id: 1, focus_id: 1, project_type_id: 1, ...overrides },
  });
  return body;
}

const tasksOf = (body) => body.weeks.flatMap((w) => w.tasks);

// Twenty check-offs, in order. The last one is what raises the offer.
async function finish(e, personId, body) {
  let latest = body;
  for (const task of tasksOf(body)) {
    ({ body: latest } = await call(e, personId, `/api/tasks/${task.id}`, {
      method: 'PATCH', body: { status: 'done' },
    }));
  }
  return latest;
}

// ------------------------------------------------------------------ gate --

test('the offer is not raised until twenty of twenty', async () => {
  const e = await env();
  const p = await plan(e);

  assert.equal(p.completable, false);
  assert.equal(p.stamp, null);

  // Nineteen. One short is not a stamp, and the route says the count rather
  // than "no".
  let latest = p;
  for (const task of tasksOf(p).slice(0, 19)) {
    ({ body: latest } = await call(e, 1, `/api/tasks/${task.id}`, {
      method: 'PATCH', body: { status: 'done' },
    }));
  }
  assert.equal(latest.done_count, 19);
  assert.equal(latest.completable, false);

  const { res, body } = await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });
  assert.equal(res.status, 409);
  assert.match(body.error, /19 of 20/);
});

test('the twentieth check-off makes the plan completable', async () => {
  const e = await env();
  const done = await finish(e, 1, await plan(e));

  assert.equal(done.done_count, 20);
  assert.equal(done.completable, true);
  assert.equal(done.stamp, null);
});

// ----------------------------------------------------------- the stamp --

test('completing writes a stamp carrying the person, country and focus', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);

  const { res, body } = await call(e, 1, `/api/plans/${p.plan.id}/complete`, {
    method: 'POST', body: { headline: 'The salt flats are a mirror' },
  });

  assert.equal(res.status, 201);
  assert.equal(body.stamp.person_id, 1);
  assert.equal(body.stamp.country_id, p.plan.country_id);
  assert.equal(body.stamp.focus_id, p.plan.focus_id);
  assert.equal(body.stamp.headline, 'The salt flats are a mirror');
  assert.ok(body.stamp.earned_at);
  // The face is printed from names, not ids.
  assert.equal(body.stamp.country_name, p.plan.country_name);
  assert.equal(body.stamp.focus_name, p.plan.focus_name);
  assert.ok(body.stamp.person_name);
  assert.ok(body.stamp.person_color);

  // And it is no longer offerable.
  assert.equal(body.completable, false);
  assert.equal(body.plan.status, 'complete');
  assert.ok(body.plan.completed_at);
});

test('a stamp with no headline is a real stamp', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);

  const { res, body } = await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });
  assert.equal(res.status, 201);
  assert.equal(body.stamp.headline, null);
});

test('completing twice answers 409 with the stamp that already exists', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);
  await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });

  const { res, body } = await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });
  assert.equal(res.status, 409);
  // Carried on the error, because a second device landing here is a route to
  // the passport rather than a failure.
  assert.ok(body.stamp);
  assert.equal(body.stamp.plan_id, p.plan.id);
});

test('a stamp is frozen — changing the plan afterwards does not rewrite it', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);
  const { body: stamped } = await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });

  // Country is free at any time (§6), even after the month is over.
  const { res } = await call(e, 1, `/api/plans/${p.plan.id}`, {
    method: 'PATCH', body: { country_id: 2 },
  });
  assert.equal(res.status, 200);

  const { body: after } = await call(e, 1, `/api/plans/${p.plan.id}`);
  assert.equal(after.plan.country_id, 2);
  assert.equal(after.stamp.country_id, stamped.stamp.country_id);
  assert.notEqual(after.stamp.country_id, 2);
});

// -------------------------------------------------------- un-completing --

test('un-completing removes the stamp and reopens the month', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);
  await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });

  const { res, body } = await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'DELETE' });
  assert.equal(res.status, 200);
  assert.equal(body.stamp, null);
  assert.equal(body.plan.status, 'active');
  assert.equal(body.plan.completed_at, null);
  // Twenty of twenty and unstamped is offerable again.
  assert.equal(body.done_count, 20);
  assert.equal(body.completable, true);
});

test('re-completing re-stamps', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);
  await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST', body: { headline: 'first' } });
  await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'DELETE' });

  const { res, body } = await call(e, 1, `/api/plans/${p.plan.id}/complete`, {
    method: 'POST', body: { headline: 'second' },
  });
  assert.equal(res.status, 201);
  assert.equal(body.stamp.headline, 'second');
});

test('un-completing a month that is not stamped is a 409', async () => {
  const e = await env();
  const p = await plan(e);

  const { res } = await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'DELETE' });
  assert.equal(res.status, 409);
});

test('un-completing leaves the twenty check-offs and their sessions alone', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);
  await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });

  const { body: before } = await call(e, 1, '/api/stats');
  await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'DELETE' });
  const { body: after } = await call(e, 1, '/api/stats');

  // Days worked never goes down (§10), and a stamp coming off is not a day
  // nobody sat at the table.
  assert.equal(after.stats[0].days_worked, before.stats[0].days_worked);
});

// ------------------------------------------------------------- headline --

test('the headline is editable afterwards, and clearable', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);
  const { body: stamped } = await call(e, 1, `/api/plans/${p.plan.id}/complete`, {
    method: 'POST', body: { headline: 'it was fun' },
  });

  const { res, body } = await call(e, 1, `/api/stamps/${stamped.stamp.id}`, {
    method: 'PATCH', body: { headline: 'Llamas hum when they are content' },
  });
  assert.equal(res.status, 200);
  assert.equal(body.stamp.headline, 'Llamas hum when they are content');

  const { body: cleared } = await call(e, 1, `/api/stamps/${stamped.stamp.id}`, {
    method: 'PATCH', body: { headline: '' },
  });
  assert.equal(cleared.stamp.headline, null);
});

test('a headline longer than a line is trimmed rather than refused', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);
  const { body } = await call(e, 1, `/api/plans/${p.plan.id}/complete`, {
    method: 'POST', body: { headline: 'x'.repeat(400) },
  });
  assert.equal(body.stamp.headline.length, 280);
});

test('patching a stamp that does not exist is a 404', async () => {
  const e = await env();
  const { res } = await call(e, 1, '/api/stamps/999', {
    method: 'PATCH', body: { headline: 'nope' },
  });
  assert.equal(res.status, 404);
});

// ------------------------------------------------------------- passport --

test('the passport carries the stamp, the nine months and the running plans', async () => {
  const e = await env();
  const mine = await plan(e, 1);
  await finish(e, 1, mine);
  await call(e, 1, `/api/plans/${mine.plan.id}/complete`, {
    method: 'POST', body: { headline: 'A line worth keeping' },
  });

  // Somebody else, same month, no stamp: the in-progress slot.
  const theirs = await plan(e, 2, futureSeptember(), { country_id: 3 });

  const { res, body } = await call(e, 1, '/api/passport');
  assert.equal(res.status, 200);
  assert.equal(body.months.length, 9);
  assert.equal(body.months[0].slice(5), '09');
  assert.equal(body.months[8].slice(5), '05');
  assert.equal(body.people.length, 3);

  assert.equal(body.stamps.length, 1);
  assert.equal(body.stamps[0].person_id, 1);
  assert.equal(body.stamps[0].headline, 'A line worth keeping');
  assert.equal(body.stamps[0].month, mine.plan.month);
  assert.ok(body.stamps[0].country_name);
  assert.ok(body.stamps[0].focus_name);

  // Every plan, not only the active ones: the stamped month has to be on the
  // grid as well, and the unstamped one has to be there without a stamp.
  const ids = body.plans.map((p) => p.id).sort();
  assert.deepEqual(ids, [mine.plan.id, theirs.plan.id].sort());
});

test('un-completing takes the stamp off the passport', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);
  await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });
  await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'DELETE' });

  const { body } = await call(e, 1, '/api/passport');
  assert.equal(body.stamps.length, 0);
  assert.equal(body.plans.length, 1);
});

// --------------------------------------------------------------- family --

test('completing is open to the family, like checking off', async () => {
  const e = await env();
  const p = await plan(e, 1);
  await finish(e, 2, p);   // a parent checking off beside a kid

  const { res, body } = await call(e, 2, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });
  assert.equal(res.status, 201);
  // The stamp is the plan's owner's, whoever tapped it.
  assert.equal(body.stamp.person_id, 1);
});

test('the home screen still knows about a month that has been stamped', async () => {
  const e = await env();
  const p = await plan(e);
  await finish(e, 1, p);
  await call(e, 1, `/api/plans/${p.plan.id}/complete`, { method: 'POST' });

  const { body } = await call(e, 1, '/api/me');
  const row = body.plans.find((row) => row.id === p.plan.id);
  // Filtered to active, the month a kid stamped on the 28th would vanish and
  // Home would invite them to start the month they had just finished.
  assert.ok(row);
  assert.equal(row.status, 'complete');
});

// ---------------------------------------------------------------- routes --

test('the completion routes are behind the family gate', async () => {
  const e = await env();
  const p = await plan(e);

  for (const [method, path] of [
    ['POST', `/api/plans/${p.plan.id}/complete`],
    ['DELETE', `/api/plans/${p.plan.id}/complete`],
    ['PATCH', '/api/stamps/1'],
  ]) {
    const res = await worker.fetch(
      new Request(`https://example.test${path}`, { method }), e,
    );
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test('completing a plan that does not exist is a 404', async () => {
  const e = await env();
  const { res } = await call(e, 1, '/api/plans/999/complete', { method: 'POST' });
  assert.equal(res.status, 404);
});

test('/passport is served as the shell', async () => {
  const e = await env();
  let asked = null;
  e.ASSETS = { fetch: (request) => { asked = new URL(request.url).pathname; return new Response('shell'); } };

  const res = await worker.fetch(new Request('https://example.test/passport'), e);
  assert.equal(res.status, 200);
  assert.equal(asked, '/index.html');
});

// ------------------------------------------------------- the grid anchor --

const dates = await import('../src/lib/dates.js');

test('a family with no plans at all gets the year setup would open', async () => {
  const e = await env();
  const { body } = await call(e, 1, '/api/passport');
  const today = dates.todayIn(e.FAMILY_TZ);

  // Nine empty slots and not an empty year behind them — over the summer, the
  // fallback is the September setup is pointing at.
  assert.deepEqual(body.months, dates.schoolYearMonths(dates.setupMonthFor(today)));
  assert.equal(body.months.length, 9);
});

test('a September set up in August moves the grid to the year ahead', async () => {
  const e = await env();
  // Whatever today is, a plan for a month later than it anchors the grid on
  // that plan's year — which is the August case: setup opens September before
  // September arrives, and the stamp has to have somewhere to land.
  const today = dates.todayIn(e.FAMILY_TZ);

  // The next month that is inside the school year and later than today.
  let ahead = dates.addMonths(dates.monthOf(today), 1);
  while (!dates.inSchoolYear(ahead)) ahead = dates.addMonths(ahead, 1);

  await call(e, 1, '/api/plans', {
    method: 'POST', body: { month: ahead, country_id: 1, focus_id: 1, project_type_id: 1 },
  });

  const { body } = await call(e, 1, '/api/passport');
  assert.deepEqual(body.months, dates.schoolYearMonths(ahead));
  assert.ok(body.months.includes(ahead));
});

test('a plan behind today does not drag the grid back a year', async () => {
  const e = await env();
  const today = dates.todayIn(e.FAMILY_TZ);

  // A month earlier in the same school year the grid is already showing.
  const [behind] = dates.schoolYearMonths(dates.monthOf(today));
  const { res } = await call(e, 1, '/api/plans', {
    method: 'POST', body: { month: behind, country_id: 1, focus_id: 1, project_type_id: 1 },
  });
  assert.equal(res.status, 201);

  const { body } = await call(e, 1, '/api/passport');
  assert.deepEqual(body.months, dates.schoolYearMonths(dates.monthOf(today)));
});
