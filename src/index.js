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
// rest do not. The wall gate sits beside it — the same passcode issues a second
// cookie type that reaches two read routes and is refused everywhere else (§8).
// All three gates check a signature rather than a lookup, so none of them
// touches D1 (§2).

import { isAdmin, readSession, issueSessionCookie, isWall, issueWallCookie } from './lib/auth.js';
import { json } from './lib/html.js';
import { adminPage, adminLogin, adminLogout, tokenForm } from './admin/index.js';
import { adminHealth } from './admin/health.js';
import { apiEraseAll, apiMigrate, apiResetMonth, apiSeed } from './admin/api.js';
import { apiPeople, apiPatchPerson } from './admin/people.js';
import { libraryPage } from './admin/library.js';
import { apiLibrary, apiLibraryExport, apiLibraryImport } from './admin/library-api.js';
import { apiCreateTask, apiPatchTask as apiAdminPatchTask } from './admin/tasks.js';
import { apiCreateFocus, apiPatchFocus, apiPutFocusTags } from './admin/focuses.js';
import { apiCreateProjectType, apiPatchProjectType } from './admin/project-types.js';
import { apiCreateLayout, apiPatchLayout } from './admin/layouts.js';
import {
  apiCountry, apiCreateHook, apiPatchHook, apiDeleteHook, apiPutAffinities,
} from './admin/countries.js';
import { apiCatalog } from './api/catalog.js';
import { apiAuth } from './api/auth.js';
import { apiMe, apiPatchMe } from './api/me.js';
import { apiCreatePlan, apiGetPlan, apiRedrawPlan, apiPatchPlan } from './api/plans.js';
import { apiFocusSamples } from './api/focuses.js';
import { apiPassport } from './api/passport.js';
import { apiCompletePlan, apiUncompletePlan, apiPatchStamp } from './api/stamps.js';
import { apiPatchTask, apiSwapTask } from './api/tasks.js';
import { apiCreateSession } from './api/sessions.js';
import { apiStats } from './api/stats.js';
import { apiWall, apiWallVersion } from './api/wall.js';
import { printPlan, printProblem } from './print.js';

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
  'GET /admin/library': libraryPage,
  'GET /admin/health': adminHealth,
  'POST /admin/logout': adminLogout,
};

const API = {
  'POST /admin/api/migrate': apiMigrate,
  'POST /admin/api/seed': apiSeed,
  'POST /admin/api/reset-month': apiResetMonth,
  'POST /admin/api/erase': apiEraseAll,
  'GET /admin/api/people': apiPeople,
  'GET /admin/api/library': apiLibrary,
  // The export and the import share a path and differ by verb: it is one file,
  // going out and coming back, and two paths for that is two names to remember.
  'GET /admin/api/library.json': apiLibraryExport,
  'POST /admin/api/library.json': apiLibraryImport,
  'POST /admin/api/tasks': apiCreateTask,
  'POST /admin/api/focuses': apiCreateFocus,
  'POST /admin/api/project-types': apiCreateProjectType,
  'POST /admin/api/layouts': apiCreateLayout,
};

// Routes carrying an id, matched after the exact tables miss. A regex list
// rather than a router: the app has five screens and this stays a list you can
// read in one go for the whole of v1.
const API_PATTERNS = [
  { method: 'PATCH', pattern: /^\/admin\/api\/people\/(?<id>\d+)$/, handler: apiPatchPerson },
  { method: 'PATCH', pattern: /^\/admin\/api\/tasks\/(?<id>\d+)$/, handler: apiAdminPatchTask },
  { method: 'PATCH', pattern: /^\/admin\/api\/focuses\/(?<id>\d+)$/, handler: apiPatchFocus },
  { method: 'PUT', pattern: /^\/admin\/api\/focuses\/(?<id>\d+)\/tags$/, handler: apiPutFocusTags },
  { method: 'PATCH', pattern: /^\/admin\/api\/project-types\/(?<id>\d+)$/, handler: apiPatchProjectType },
  { method: 'PATCH', pattern: /^\/admin\/api\/layouts\/(?<id>\d+)$/, handler: apiPatchLayout },
  { method: 'GET', pattern: /^\/admin\/api\/countries\/(?<id>\d+)$/, handler: apiCountry },
  { method: 'POST', pattern: /^\/admin\/api\/countries\/(?<id>\d+)\/hooks$/, handler: apiCreateHook },
  { method: 'PUT', pattern: /^\/admin\/api\/countries\/(?<id>\d+)\/affinities$/, handler: apiPutAffinities },
  { method: 'PATCH', pattern: /^\/admin\/api\/hooks\/(?<id>\d+)$/, handler: apiPatchHook },
  { method: 'DELETE', pattern: /^\/admin\/api\/hooks\/(?<id>\d+)$/, handler: apiDeleteHook },
];

// The same, behind the family gate. Handlers here take the session as well as
// the params, because every one of them writes or reads something owned.
const FAMILY_API_PATTERNS = [
  { method: 'GET', pattern: /^\/api\/plans\/(?<id>\d+)$/, handler: apiGetPlan },
  { method: 'PATCH', pattern: /^\/api\/plans\/(?<id>\d+)$/, handler: apiPatchPlan },
  { method: 'POST', pattern: /^\/api\/plans\/(?<id>\d+)\/redraw$/, handler: apiRedrawPlan },
  { method: 'POST', pattern: /^\/api\/plans\/(?<id>\d+)\/complete$/, handler: apiCompletePlan },
  { method: 'DELETE', pattern: /^\/api\/plans\/(?<id>\d+)\/complete$/, handler: apiUncompletePlan },
  { method: 'PATCH', pattern: /^\/api\/stamps\/(?<id>\d+)$/, handler: apiPatchStamp },
  { method: 'GET', pattern: /^\/api\/focuses\/(?<id>\d+)\/samples$/, handler: apiFocusSamples },
  { method: 'PATCH', pattern: /^\/api\/tasks\/(?<id>\d+)$/, handler: apiPatchTask },
  { method: 'POST', pattern: /^\/api\/tasks\/(?<id>\d+)\/swap$/, handler: apiSwapTask },
];

function matchPattern(method, pathname, patterns = API_PATTERNS) {
  let pathExists = false;
  for (const route of patterns) {
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

// What a wall cookie can reach, and the whole of it. An allowlist rather than a
// list of banned methods: "requests carrying it are rejected on every write
// route" (§8) is a property that has to survive slice 08 and slice 10 adding
// routes, and a route added below is behind this by default rather than by
// remembering.
//
// POST /api/auth is not in here because it does not need to be — it is
// dispatched from OPEN_API before the gate is reached at all, which is exactly
// the exemption Q-10 asks for and the reason it stays a single route: the most
// that route can hand a wall cookie back is another wall cookie.
const WALL_API = {
  'GET /api/wall': apiWall,
  'GET /api/wall/version': apiWallVersion,
};

// Everything else the family reaches. The gate sits in front of this table, not
// inside each handler, so a route added in a later slice is behind the passcode
// by default rather than by remembering.
//
// The wall's two are spread in rather than repeated: a parent looking at the
// kitchen screen from their own phone is holding a family cookie, not a wall
// one, and these are reads of what the family already sees. Spread rather than
// listed twice so the two tables cannot drift.
const FAMILY_API = {
  'GET /api/me': apiMe,
  'PATCH /api/me': apiPatchMe,
  'GET /api/catalog': apiCatalog,
  'GET /api/passport': apiPassport,
  'POST /api/plans': apiCreatePlan,
  'POST /api/sessions': apiCreateSession,
  'GET /api/stats': apiStats,
  ...WALL_API,
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

// A request carrying nothing but the wall cookie. Two routes answer it and
// everything else is 403 — not 404, because the tablet is a family device and
// "you cannot do that here" is the true answer, and not 401, because it is signed
// in perfectly well.
//
// 403 covers reads as well as writes. §8 only demands the writes, but the wall
// has no person and no business with /api/me or /api/catalog; a rule that names
// the two routes it does need is one a later slice cannot widen by accident.
async function wall(request, env, route) {
  const handler = WALL_API[route];
  if (!handler) {
    return json({
      ok: false,
      error: 'The wall screen is read-only.',
    }, { status: 403 });
  }
  return withCookie(await handler(request, env), await issueWallCookie(env));
}

async function api(request, env, url) {
  const route = `${request.method} ${url.pathname}`;

  // Before either gate. This is the whole of Q-10: a wall cookie reaching the
  // route that issues wall cookies is how a tablet whose year ran out gets
  // another one, and there is no second exemption anywhere below.
  const open = OPEN_API[route];
  if (open) return open(request, env);

  const session = await readSession(request, env);

  // The family session wins when both cookies are present. A device holding one
  // is a phone somebody signed in on; the tablet on the wall only ever has the
  // other, so this can never quietly hand the wall a writeable identity.
  if (!session && await isWall(request, env)) return wall(request, env, route);

  const handler = FAMILY_API[route];

  if (!session) {
    // 401 before 404: which routes exist is not something an unauthenticated
    // request gets to map. The shell reads this one status as "show the
    // passcode".
    return json({ ok: false, error: 'Not signed in' }, { status: 401 });
  }

  const matched = handler ? null : matchPattern(request.method, url.pathname, FAMILY_API_PATTERNS);

  if (handler || matched?.handler) {
    const response = handler
      ? await handler(request, env, session)
      : await matched.handler(request, env, session, matched.params);
    // PATCH /api/me sets its own cookie carrying the new person. Re-issuing on
    // top of it would append a second Set-Cookie with the old identity.
    const alreadySet = response.headers.has('set-cookie');
    return alreadySet ? response : withCookie(response, await issueSessionCookie(env, session.personId));
  }

  if (matched?.pathExists) return methodNotAllowed();

  const tables = { ...OPEN_API, ...FAMILY_API };
  const exists = Object.keys(tables).some((k) => k.endsWith(` ${url.pathname}`));
  return exists ? methodNotAllowed() : notFound();
}

// GET /print/:planId — the month's pages (DESIGN.md §16). Behind the family
// cookie and outside /api/, so it gets its own gate rather than a table entry:
// it answers with a document, and the two tables above answer with JSON.
//
// A family cookie with no person still prints. The plan carries whose month it
// is; picking a person is what the shell needs to know which board to open, and
// a parent who has never picked one is exactly the person standing at the
// printer (Q-12).
//
// The wall's cookie is refused and gets no exception. Nothing on the kitchen
// tablet opens a print dialog (§8), and a 401 rather than a 403 is the honest
// answer: the family passcode is what is missing.
const PRINT_PATTERN = /^\/print\/(?<id>\d+)$/;

async function print(request, env, url) {
  const match = PRINT_PATTERN.exec(url.pathname);
  if (!match) return notFound();
  if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed();

  const session = await readSession(request, env);
  if (!session) {
    return printProblem(401, 'Sign in on this device first, then open this page again.');
  }

  const response = await printPlan(request, env, session, match.groups);
  return withCookie(response, await issueSessionCookie(env, session.personId));
}

// The app is one static document that routes client-side. Assets are served
// before the Worker, so `/` never arrives here in production — but `/settings`
// does, and it has to come back as the same document rather than a 404.
//
// An explicit list, not a catch-all: a typo in a fetch URL should 404, not
// return HTML that the client then fails to parse as JSON.
const SHELL_PATHS = new Set(['/', '/settings', '/setup', '/passport']);

// The one client route carrying an id. `/plan/12` is a screen; `/plan/twelve` is
// a typo and 404s like any other.
const SHELL_PATTERNS = [/^\/plan\/\d+$/];

const isShellPath = (pathname) =>
  SHELL_PATHS.has(pathname) || SHELL_PATTERNS.some((p) => p.test(pathname));

function serveDocument(request, env, url, file) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed();
  if (!env.ASSETS) return notFound();
  return env.ASSETS.fetch(new Request(new URL(file, url), request));
}

const shell = (request, env, url) => serveDocument(request, env, url, '/index.html');

// The wall is its own document, not a route inside the shell. The shell's first
// act is to fetch /api/me, which a wall cookie is refused — so a wall rendered
// by app.js would open on the passcode screen every time. Two documents, one
// stylesheet, and no shared state to get wrong.
//
// Like `/`, this normally never arrives here: the assets binding serves
// /wall.html for /wall before the Worker sees the request. It is wired anyway
// so the path is declared in one place and answers the same either way.
const wallPage = (request, env, url) => serveDocument(request, env, url, '/wall.html');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      return admin(request, env, url);
    }

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return api(request, env, url);
    }

    if (url.pathname === '/wall') return wallPage(request, env, url);

    if (url.pathname === '/print' || url.pathname.startsWith('/print/')) {
      return print(request, env, url);
    }

    if (isShellPath(url.pathname)) return shell(request, env, url);

    return notFound();
  },
};
