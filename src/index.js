// Worker entry and routing.
//
// Static assets are served by the [assets] binding before a request reaches
// here; anything that is not a file falls through to this handler.
//
// The admin gate is a prefix split, not content negotiation: /admin/* serves
// pages and /admin/api/* serves JSON, both under the one path the admin cookie
// is scoped to (DESIGN.md §3).

import { isAdmin } from './lib/auth.js';
import { json } from './lib/html.js';
import { adminPage, adminLogin, adminLogout, tokenForm } from './admin/index.js';
import { adminHealth } from './admin/health.js';
import { apiMigrate, apiResetMonth } from './admin/api.js';

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
  'POST /admin/api/reset-month': apiResetMonth,
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

  // A known path reached with the wrong method is worth distinguishing from a
  // path that does not exist.
  const table = isApi ? API : PAGES;
  const exists = Object.keys(table).some((k) => k.endsWith(` ${url.pathname}`));
  return exists ? methodNotAllowed() : notFound();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      return admin(request, env, url);
    }

    return notFound();
  },
};
