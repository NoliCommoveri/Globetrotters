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

// Everything else that came back with a body. The status and the body travel
// with the message because one caller needs them: POST /api/plans answers 409
// with the id of the plan that already exists, and that is a route rather than
// an error (DESIGN.md §7).
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data || {};
  }
}

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
    throw new ApiError((data && data.error) || `Something went wrong (${res.status}).`, res.status, data);
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

// Countries, hooks, affinities, focuses and project types — the whole country
// picker in one fetch. The browser revalidates it against an ETag and mostly
// takes a 304, so this is cheap to call on every setup (Q-05).
export const getCatalog = () => call('/api/catalog');

// What setup reads for the ink dots and for what the shuffle must skip (Q-07).
export const getPassport = () => call('/api/passport');

// Three titles that say what a focus will actually do to the month (Q-06). One
// request per focus tapped, memoized for the life of the page: the answer does
// not change between library edits and a kid taps back and forth.
const samples = new Map();
export function getFocusSamples(focusId) {
  if (!samples.has(focusId)) {
    samples.set(focusId, call(`/api/focuses/${focusId}/samples`).catch((err) => {
      samples.delete(focusId);
      throw err;
    }));
  }
  return samples.get(focusId);
}

export const createPlan = (body) => send('/api/plans', 'POST', body);
export const getPlan = (id) => call(`/api/plans/${id}`);
export const redrawPlan = (id) => send(`/api/plans/${id}/redraw`, 'POST', {});
export const patchPlan = (id, body) => send(`/api/plans/${id}`, 'PATCH', body);

// The daily loop. All three answer with the whole plan — the ring, the pips, the
// counts and the notes all move on one tap, and a client merging four of those
// by hand gets one of them wrong.
export const patchTask = (id, status) => send(`/api/tasks/${id}`, 'PATCH', { status });
export const swapTask = (id) => send(`/api/tasks/${id}/swap`, 'POST', {});
export const postSession = (body) => send('/api/sessions', 'POST', body);

// The month's end. `complete` answers 201 with the whole plan, the stamp on it;
// 409 means it is already stamped and carries that stamp, which the shell reads
// as "go to the passport" rather than as an error (§7).
export const completePlan = (id, headline) =>
  send(`/api/plans/${id}/complete`, 'POST', { headline: headline || null });

// The only destructive call the family can make. The confirm step is on the
// client, where the thing being destroyed is on screen.
export const uncompletePlan = (id) => send(`/api/plans/${id}/complete`, 'DELETE');

// The stamp's one line, editable from the passport for as long as the passport
// exists. It answers with the stamp alone — the passport refetches itself.
export const patchStamp = (id, headline) =>
  send(`/api/stamps/${id}`, 'PATCH', { headline: headline || null });

// Days worked, the number that replaces the streak. Its own route because it
// reaches back across every month of the year, which no plan payload does.
export const getStats = (all = false) => call(all ? '/api/stats?all=1' : '/api/stats');
