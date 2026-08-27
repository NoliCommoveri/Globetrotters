// The family session cookie. Its whole job is to be the last login screen
// anyone sees for nine months, so the tests are about the two ways that fails:
// it expires, or it can be edited into someone else.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  issueSessionCookie, clearSessionCookie, readSession, checkPasscode, hmac,
} from '../src/lib/auth.js';

const env = { ADMIN_TOKEN: 'a-long-admin-token', FAMILY_PASSCODE: 'wanderlust' };

const YEAR = 365 * 24 * 60 * 60;

function requestWith(setCookie) {
  return new Request('https://example.test/api/me', {
    headers: { cookie: setCookie.split(';')[0] },
  });
}

const parts = async (personId) => {
  const cookie = await issueSessionCookie(env, personId);
  return cookie.split(';')[0].split('=')[1].split('.');
};

test('a cookie issued before the person is picked authenticates with no person', async () => {
  const session = await readSession(requestWith(await issueSessionCookie(env, null)), env);
  assert.deepEqual(session, { personId: null });
});

test('a cookie carrying a person returns that person', async () => {
  const session = await readSession(requestWith(await issueSessionCookie(env, 2)), env);
  assert.deepEqual(session, { personId: 2 });
});

test('the cookie reaches the whole app, lasts a year, and script cannot read it', async () => {
  const cookie = await issueSessionCookie(env, 1);
  assert.match(cookie, /Path=\/(;|$)/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, new RegExp(`Max-Age=${YEAR}(;|$)`));
});

test('editing the person id into someone else fails the signature', async () => {
  const [expires, person, sig] = await parts(1);
  assert.equal(person, '1');
  assert.equal(await readSession(requestWith(`gt_session=${expires}.2.${sig}`), env), null);
});

test('a tampered signature, a junk cookie and no cookie all fail', async () => {
  const [expires, person, sig] = await parts(3);
  const flipped = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0');
  assert.equal(await readSession(requestWith(`gt_session=${expires}.${person}.${flipped}`), env), null);
  assert.equal(await readSession(requestWith('gt_session=nonsense'), env), null);
  assert.equal(await readSession(new Request('https://example.test/api/me'), env), null);
});

test('pushing the expiry forward invalidates the signature', async () => {
  const [expires, person, sig] = await parts(1);
  const later = Number(expires) + 86400;
  assert.equal(await readSession(requestWith(`gt_session=${later}.${person}.${sig}`), env), null);
});

test('an expired cookie fails even though it is correctly signed', async () => {
  const past = Math.floor(Date.now() / 1000) - 60;
  const sig = await hmac(env.ADMIN_TOKEN, `session.${past}.1`);
  assert.equal(await readSession(requestWith(`gt_session=${past}.1.${sig}`), env), null);
});

test('rotating ADMIN_TOKEN logs all three people out', async () => {
  const old = await issueSessionCookie({ ADMIN_TOKEN: 'the-old-token' }, 1);
  assert.equal(await readSession(requestWith(old), env), null);
  assert.equal(await readSession(requestWith(await issueSessionCookie(env, 1)), {}), null);
});

test('clearing expires the cookie on the same path it was set on', () => {
  const cleared = clearSessionCookie();
  assert.match(cleared, /Path=\/(;|$)/);
  assert.match(cleared, /Max-Age=0(;|$)/);
});

test('the passcode is trimmed, exact, and useless when the secret is unset', () => {
  assert.equal(checkPasscode(env, 'wanderlust'), true);
  assert.equal(checkPasscode(env, '  wanderlust '), true);
  assert.equal(checkPasscode(env, 'wanderlus'), false);
  assert.equal(checkPasscode(env, 'Wanderlust'), false);
  assert.equal(checkPasscode(env, null), false);
  assert.equal(checkPasscode({}, ''), false);
});
