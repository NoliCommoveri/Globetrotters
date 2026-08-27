// Admin access. The family passcode and the person cookie are slice 03; the
// HMAC below is shared with them, which is the point of it living here.
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
