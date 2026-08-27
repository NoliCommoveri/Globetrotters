import test from 'node:test';
import assert from 'node:assert/strict';

import { issueAdminCookie, isAdmin, checkAdminToken, timingSafeEqual, hmac } from '../src/lib/auth.js';

const env = { ADMIN_TOKEN: 'a-long-admin-token' };

function requestWith(setCookie) {
  const value = setCookie.split(';')[0];
  return new Request('https://example.test/admin', { headers: { cookie: value } });
}

test('a freshly issued cookie authenticates', async () => {
  assert.equal(await isAdmin(requestWith(await issueAdminCookie(env)), env), true);
});

test('the cookie is scoped to /admin and not readable by script', async () => {
  const cookie = await issueAdminCookie(env);
  assert.match(cookie, /Path=\/admin(;|$)/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
});

test('no cookie, a junk cookie, or a tampered signature all fail', async () => {
  const none = new Request('https://example.test/admin');
  assert.equal(await isAdmin(none, env), false);
  assert.equal(await isAdmin(requestWith('gt_admin=nonsense'), env), false);

  const good = await issueAdminCookie(env);
  const [name, value] = good.split(';')[0].split('=');
  const [expires, sig] = value.split('.');
  const flipped = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0');
  assert.equal(await isAdmin(requestWith(`${name}=${expires}.${flipped}`), env), false);
});

test('pushing the expiry forward invalidates the signature', async () => {
  const good = await issueAdminCookie(env);
  const [name, value] = good.split(';')[0].split('=');
  const [expires, sig] = value.split('.');
  const later = Number(expires) + 86400;
  assert.equal(await isAdmin(requestWith(`${name}=${later}.${sig}`), env), false);
});

test('an expired cookie fails even though it is correctly signed', async () => {
  const past = Math.floor(Date.now() / 1000) - 60;
  const sig = await hmac(env.ADMIN_TOKEN, `admin.${past}`);
  assert.equal(await isAdmin(requestWith(`gt_admin=${past}.${sig}`), env), false);
});

test('a cookie signed with a different token fails — rotating ADMIN_TOKEN signs everyone out', async () => {
  const old = await issueAdminCookie({ ADMIN_TOKEN: 'the-old-token' });
  assert.equal(await isAdmin(requestWith(old), env), false);
});

test('with no ADMIN_TOKEN set, nothing authenticates', async () => {
  const cookie = await issueAdminCookie(env);
  assert.equal(await isAdmin(requestWith(cookie), {}), false);
  assert.equal(checkAdminToken({}, ''), false);
});

test('the token check accepts only the exact value', () => {
  assert.equal(checkAdminToken(env, 'a-long-admin-token'), true);
  assert.equal(checkAdminToken(env, 'a-long-admin-toke'), false);
  assert.equal(checkAdminToken(env, 'a-long-admin-tokenX'), false);
  assert.equal(checkAdminToken(env, null), false);
  assert.equal(timingSafeEqual('', ''), true);
});
