// Worker entry and routing.
//
// Static assets are served by the [assets] binding before a request reaches
// here; anything that is not a file falls through to this handler.
//
// The admin gate is a prefix split, not content negotiation: /admin/* serves
// pages and /admin/api/* serves JSON, both under the one path the admin cookie
// is scoped to (DESIGN.md §3).
//
// The family gate is a table split: one route answers without a cookie, the
// rest do not. Both gates check a signature rather than a lookup, so neither
// touches D1 (§2).

import { isAdmin, readSession, issueSessionCookie } from './lib/auth.js';
import { json } from './lib/html.js';
import { adminPage, adminLogin, adminLogout, tokenForm } from './admin/index.js';
import { adminHealth } from './admin/health.js';
import { apiMigrate, apiResetMonth, apiSeed } from './admin/api.js';
import { apiPeople, apiPatchPerson } from './admin/people.js';
import { apiCatalog } from './api/catalog.js';
import { apiAuth } from './api/auth.js';
import { apiMe, apiPatchMe } from './api/me.js';

function notFound() {
  return new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

function methodNotAllowed() {
  return new Response('Method not allowed', {
    status: 405,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

const PAGES = {
  'GET /admin': adminPage,
  'GET /admin/health': adminHealth,
  'POST /admin/logout': adminLogout,
};

const API = {
  'POST /admin/api/migrate': apiMigrate,
  'POST /admin/api/seed': apiSeed,
  'POST /admin/api/reset-month': apiResetMonth,
  'GET /admin/api/people': apiPeople,
};

// Routes carrying an id, matched after the exact tables miss. A regex list
// rather than a router: the app has five screens and this stays a list you can
// read in one go for the whole of v1.
const API_PATTERNS = [
  { method: 'PATCH', pattern: /^\/admin\/api\/people\/(?<id>\d+)$/, handler: apiPatchPerson },
];

function matchPattern(method, pathname) {
  let pathExists = false;
  for (const route of API_PATTERNS) {
    const m = route.pattern.exec(pathname);
    if (!m) continue;
    pathExists = true;
    if (route.method === method) return { handler: route.handler, params: m.groups || {} };
  }
  return { handler: null, params: null, pathExists };
}

// The one family route that answers without a cookie, because it is what issues
// one.
const OPEN_API = {
  'POST /api/auth': apiAuth,
};

// Everything else the family reaches. The gate sits in front of this table, not
// inside each handler, so a route added in a later slice is behind the passcode
// by default rather than by remembering.
const FAMILY_API = {
  'GET /api/me': apiMe,
  'PATCH /api/me': apiPatchMe,
  'GET /api/catalog': apiCatalog,
};

async function admin(request, env, url) {
  const route = `${request.method} ${url.pathname}`;

  // The one unauthenticated write in the app: the token form's own target.
  if (route === 'POST /admin') return adminLogin(request, env);
  if (route === 'GET /admin' && !(await isAdmin(request, env))) return tokenForm(null);

  const isApi = url.pathname === '/admin/api' || url.pathname.startsWith('/admin/api/');
  if (!(await isAdmin(request, env))) {
    // Pages get the form; JSON gets 401. The split is by prefix, so an expired
    // cookie never lands the owner on a login form rendered inside a fetch.
    return isApi
      ? json({ ok: false, error: 'Not signed in' }, { status: 401 })
      : tokenForm('Signed out.');
  }

  const handler = (isApi ? API : PAGES)[route];
  if (handler) return handler(request, env);

  if (isApi) {
    const matched = matchPattern(request.method, url.pathname);
    if (matched.handler) return matched.handler(request, env, matched.params);
    if (matched.pathExists) return methodNotAllowed();
  }

  // A known path reached with the wrong method is worth distinguishing from a
  // path that does not exist.
  const table = isApi ? API : PAGES;
  const exists = Object.keys(table).some((k) => k.endsWith(` ${url.pathname}`));
  return exists ? methodNotAllowed() : notFound();
}

// The cookie is re-issued on every authenticated response, which is what makes
// the year slide forward instead of expiring in March (DESIGN.md §2). Headers
// are copied rather than mutated because a handler is free to return a Response
// whose headers are not its own.
function withCookie(response, cookie) {
  const headers = new Headers(response.headers);
  headers.append('set-cookie', cookie);
  const bodyless = response.status === 204 || response.status === 304;
  return new Response(bodyless ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function api(request, env, url) {
  const route = `${request.method} ${url.pathname}`;

  const open = OPEN_API[route];
  if (open) return open(request, env);

  const session = await readSession(request, env);
  const handler = FAMILY_API[route];

  if (!session) {
    // 401 before 404: which routes exist is not something an unauthenticated
    // request gets to map. The shell reads this one status as "show the
    // passcode".
    return json({ ok: false, error: 'Not signed in' }, { status: 401 });
  }

  if (handler) {
    const response = await handler(request, env, session);
    // PATCH /api/me sets its own cookie carrying the new person. Re-issuing on
    // top of it would append a second Set-Cookie with the old identity.
    const alreadySet = response.headers.has('set-cookie');
    return alreadySet ? response : withCookie(response, await issueSessionCookie(env, session.personId));
  }

  const tables = { ...OPEN_API, ...FAMILY_API };
  const exists = Object.keys(tables).some((k) => k.endsWith(` ${url.pathname}`));
  return exists ? methodNotAllowed() : notFound();
}

// The app is one static document that routes client-side. Assets are served
// before the Worker, so `/` never arrives here in production — but `/settings`
// does, and it has to come back as the same document rather than a 404.
//
// An explicit list, not a catch-all: a typo in a fetch URL should 404, not
// return HTML that the client then fails to parse as JSON.
const SHELL_PATHS = new Set(['/', '/settings']);

function shell(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed();
  if (!env.ASSETS) return notFound();
  return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      return admin(request, env, url);
    }

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return api(request, env, url);
    }

    if (SHELL_PATHS.has(url.pathname)) return shell(request, env, url);

    return notFound();
  },
};
