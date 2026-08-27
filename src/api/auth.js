// POST /api/auth — the one screen this app tries to show exactly once per
// device (DESIGN.md §2).
//
// It is the only unauthenticated route under /api, for the same reason POST
// /admin is the only unauthenticated write under /admin: it is what issues the
// cookie the gate checks.
//
// No person is selected here. The passcode says the device belongs to the
// family; PATCH /api/me says who is holding it. Splitting them is what keeps
// the wall's future exemption (Q-10) to a single route that cannot set an
// identity.

import { json } from '../lib/html.js';
import { checkPasscode, issueSessionCookie, clearSessionCookie } from '../lib/auth.js';

export async function apiAuth(request, env) {
  const body = await request.json().catch(() => ({}));

  // A missing secret is not a wrong passcode, and saying so is the difference
  // between a five-minute fix and an afternoon. Nobody but the owner can reach
  // a deploy where this is true.
  if (!env.FAMILY_PASSCODE || !env.ADMIN_TOKEN) {
    return json({ ok: false, error: 'Server is missing FAMILY_PASSCODE or ADMIN_TOKEN' }, { status: 500 });
  }

  if (!checkPasscode(env, body.passcode)) {
    // Clear on failure: a device holding a cookie signed with a rotated
    // ADMIN_TOKEN otherwise keeps sending it forever.
    return json({ ok: false, error: 'That passcode is not right' }, {
      status: 401,
      headers: { 'set-cookie': clearSessionCookie() },
    });
  }

  return json({ ok: true }, { headers: { 'set-cookie': await issueSessionCookie(env, null) } });
}

