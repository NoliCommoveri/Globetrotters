// Worker entry and routing.
//
// Static assets are served by the [assets] binding before a request reaches
// here; anything that is not a file falls through to this handler.

import { adminHealth } from './admin/health.js';

function notFound() {
  return new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/admin/health') {
      return adminHealth(request, env);
    }

    return notFound();
  },
};
