// Every call the shell makes. One place, so the two rules that apply to all of
// them — send the cookie, treat 401 as "show the passcode" — are written once.

// The session cookie is HttpOnly, so nothing here ever reads it. `same-origin`
// is the default for fetch, and stating it is the reminder that the cookie is
// the entire auth mechanism: there is no token in a header and no Authorization
// to forget.
const OPTIONS = { credentials: 'same-origin', headers: { accept: 'application/json' } };

// Thrown on 401 and caught by the shell, which re-renders as the passcode
// screen. A signed-out device and a broken one must not look the same.
export class SignedOut extends Error {}

async function call(path, init = {}) {
  let res;
  try {
    res = await fetch(path, { ...OPTIONS, ...init, headers: { ...OPTIONS.headers, ...(init.headers || {}) } });
  } catch {
    // Offline, or the Worker is mid-deploy. Neither is a signed-out device.
    throw new Error('Cannot reach Globetrotters. Check the connection and try again.');
  }

  if (res.status === 401) throw new SignedOut();

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.ok !== true) {
    throw new Error((data && data.error) || `Something went wrong (${res.status}).`);
  }
  return data;
}

function send(path, method, body) {
  return call(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}

// The whole family, this device's person, and every active plan — one fetch, on
// launch and on every return to the tab.
export const getMe = () => call('/api/me');

export const postAuth = (passcode) => send('/api/auth', 'POST', { passcode });

export const patchMe = (personId) => send('/api/me', 'PATCH', { person_id: personId });
