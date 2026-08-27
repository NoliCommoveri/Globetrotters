// Every signed cookie in the app, in three blocks: the admin cookie, the family
// session, the wall. They share one HMAC and one key, which is why they share a
// file.
//
// `ADMIN_TOKEN` is both the admin password and the key every signed cookie in
// this app is keyed on (DESIGN.md §2, §3, Q-03). Changing it locks the owner
// out of /admin and logs all three people out — one event, not two.

const ADMIN_COOKIE = 'gt_admin';

// Eight hours: long enough to deploy, apply pending, check health and come back
// after dinner; short enough that a shared laptop left open is not a standing
// door into the library editor. The kid-proofing that matters is that nothing
// in the app ever renders a link to /admin (§3).
const ADMIN_TTL_SECONDS = 8 * 60 * 60;

export async function hmac(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Length-independent comparison. The threat model here is a curious 12-year-old
// (§3), not a timing attack, but this costs one function and removes the
// question.
export function timingSafeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export async function issueAdminCookie(env) {
  const expires = Math.floor(Date.now() / 1000) + ADMIN_TTL_SECONDS;
  const sig = await hmac(env.ADMIN_TOKEN, `admin.${expires}`);
  return `${ADMIN_COOKIE}=${expires}.${sig}; HttpOnly; Secure; SameSite=Lax; `
    + `Path=/admin; Max-Age=${ADMIN_TTL_SECONDS}`;
}

export function clearAdminCookie() {
  return `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/admin; Max-Age=0`;
}

// The cookie carries its own expiry and a signature over it, so a stale or
// edited cookie fails here rather than in a lookup table the Worker does not
// have.
export async function isAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const raw = readCookie(request, ADMIN_COOKIE);
  if (!raw) return false;
  const dot = raw.indexOf('.');
  if (dot === -1) return false;
  const expires = Number(raw.slice(0, dot));
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(raw.slice(dot + 1), await hmac(env.ADMIN_TOKEN, `admin.${expires}`));
}

export function checkAdminToken(env, submitted) {
  if (!env.ADMIN_TOKEN) return false;
  return timingSafeEqual(submitted ?? '', env.ADMIN_TOKEN);
}

// ---------------------------------------------------------------------------
// The family session. One shared passcode, typed once per device, then a signed
// cookie that slides forward for a year (DESIGN.md §2).
//
// Same HMAC, same key: `ADMIN_TOKEN` signs this cookie too, so there is no
// fourth secret and rotating it logs all three people out at the same moment it
// locks the owner out of /admin. One event, not two (Q-03).

const SESSION_COOKIE = 'gt_session';

// One year, re-issued on every authenticated request below. The project runs
// September through May; a cookie that expires mid-March is a login screen in
// the middle of the nine months this app exists to avoid.
const SESSION_TTL_SECONDS = 365 * 24 * 60 * 60;

// Path=/ rather than Path=/api: the shell is a static asset at /, and the same
// cookie has to reach both. The admin cookie stays on Path=/admin, so the two
// never travel together.
function sessionCookie(value, maxAge) {
  return `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

// `expires.personId.signature`, with personId empty between the passcode and
// the person picker. The signature covers both halves, so an edited person id
// fails here rather than silently becoming someone else.
export async function issueSessionCookie(env, personId) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const person = personId == null ? '' : String(personId);
  const sig = await hmac(env.ADMIN_TOKEN, `session.${expires}.${person}`);
  return sessionCookie(`${expires}.${person}.${sig}`, SESSION_TTL_SECONDS);
}

export function clearSessionCookie() {
  return sessionCookie('', 0);
}

// Returns { personId } — personId null when the passcode is in but nobody has
// been picked yet — or null when there is no valid session at all. The caller
// distinguishes "not signed in" from "signed in, no person" on that difference.
export async function readSession(request, env) {
  if (!env.ADMIN_TOKEN) return null;
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [expiresRaw, person, sig] = parts;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return null;
  const expected = await hmac(env.ADMIN_TOKEN, `session.${expires}.${person}`);
  if (!timingSafeEqual(sig, expected)) return null;
  return { personId: person === '' ? null : Number(person) };
}

// The passcode is trimmed on both sides. A phone keyboard adds a trailing space
// often enough that not trimming reads as a wrong passcode.
export function checkPasscode(env, submitted) {
  if (!env.FAMILY_PASSCODE) return false;
  return timingSafeEqual(String(submitted ?? '').trim(), String(env.FAMILY_PASSCODE).trim());
}

// ---------------------------------------------------------------------------
// The wall cookie. Its own type, so the kitchen tablet is not holding a
// full-write family cookie for nine months (DESIGN.md §8, Q-10).
//
// Same HMAC, same key, one more domain string. What makes it read-only is not
// the cookie — it is that src/index.js reaches a two-route allowlist with it and
// 403s everything else. The cookie's whole job is to say "this device typed the
// passcode once, at /wall".
//
// It carries no person and cannot be made to. The wall shows all three people
// and has no identity of its own, which is exactly why POST /api/auth is safe
// to leave open to it: the only thing that route can hand back is another
// cookie just like this one.

const WALL_COOKIE = 'gt_wall';

// A year, re-issued on every wall response. The tablet is plugged into a wall
// and nobody is standing at it — a cookie that expires in March is a passcode
// prompt on a screen with no keyboard in front of it.
const WALL_TTL_SECONDS = 365 * 24 * 60 * 60;

function wallCookie(value, maxAge) {
  return `${WALL_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export async function issueWallCookie(env) {
  const expires = Math.floor(Date.now() / 1000) + WALL_TTL_SECONDS;
  const sig = await hmac(env.ADMIN_TOKEN, `wall.${expires}`);
  return wallCookie(`${expires}.${sig}`, WALL_TTL_SECONDS);
}

// True when the request carries a valid wall cookie. There is nothing to return
// but the fact: the wall has no person, no preferences and no state on the
// server.
export async function isWall(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const raw = readCookie(request, WALL_COOKIE);
  if (!raw) return false;
  const dot = raw.indexOf('.');
  if (dot === -1) return false;
  const expires = Number(raw.slice(0, dot));
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(raw.slice(dot + 1), await hmac(env.ADMIN_TOKEN, `wall.${expires}`));
}
