// The service worker. It exists for one thing: the app opens when there is no
// signal, on its own screens, instead of on the browser's error page
// (DESIGN.md §2).
//
// ─────────────────────────────────────────────────────────────────────────────
// BUMP `CACHE_VERSION` IN THE SAME COMMIT AS ANY CHANGE UNDER public/.
//
// The cache is refreshed from the network on every load, so a missed bump does
// not strand an online device — but the offline copy is only rebuilt when the
// cache name changes, and a file that was renamed or deleted lives on in the
// old cache until then. See CLAUDE.md.
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_VERSION = 'v3';
const CACHE_NAME = `globetrotters-${CACHE_VERSION}`;

// Listed rather than crawled: a worker cannot read its own directory, and the
// list is the only way a test can tell that a module was added and not cached.
// These are the URLs the browser asks for, so the two documents appear as the
// paths they are navigated to — `/index.html` is a file on disk and a redirect
// on the wire.
const PRECACHE = [
  '/',
  '/wall',
  '/manifest.json',
  '/wall-manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/css/app.css',
  '/js/api.js',
  '/js/app.js',
  '/js/deal.js',
  '/js/dom.js',
  '/js/passport.js',
  '/js/plan.js',
  '/js/print-page.js',
  '/js/router.js',
  '/js/setup.js',
  '/js/stamp.js',
  '/js/sw-register.js',
  '/js/week.js',
  '/js/wall.js',
];

// The two files under public/ deliberately left out, declared so a test can
// hold PRECACHE to every other file in the directory.
const NOT_PRECACHED = [
  // Loaded by /print/:planId, which the Worker renders and which therefore
  // needs the network before the stylesheet matters.
  '/css/print.css',
  // For crawlers. Nothing in the app ever fetches it.
  '/robots.txt',
];

// Which cached document stands in for a navigation the network could not
// answer, or null for a path this worker has no offline answer for — /admin and
// /print/:planId are Worker-rendered, and the family app is not a stand-in for
// either. Mirrors SHELL_PATHS in src/index.js.
const SHELL_PATHS = ['/', '/settings', '/setup', '/passport'];
const SHELL_PATTERNS = [/^\/plan\/\d+$/];

function documentFor(pathname) {
  if (pathname === '/wall') return '/wall';
  if (SHELL_PATHS.includes(pathname)) return '/';
  if (SHELL_PATTERNS.some((p) => p.test(pathname))) return '/';
  return null;
}

// Never cached, and never intercepted: the request goes to the network exactly
// as it would with no worker installed.
function passThrough(pathname) {
  return pathname === '/api' || pathname.startsWith('/api/')
    || pathname === '/admin' || pathname.startsWith('/admin/')
    || pathname === '/print' || pathname.startsWith('/print/');
}

function cacheable(response) {
  return response && response.ok && response.type === 'basic' && !response.redirected;
}

// Network first, always. The cache answers only when the network could not,
// which is what keeps this worker incapable of serving yesterday's app to a
// phone that has a signal — the failure mode a cache-first shell has and this
// one does not.
async function networkFirst(request, cacheKey) {
  try {
    const response = await fetch(request);
    if (cacheable(response)) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy)).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(cacheKey).catch(() => null);
    // Response.error() is what the browser would have produced on its own. It
    // is reached only when the network failed and nothing is cached, and it is
    // returned rather than thrown so that a rejected handler can never turn a
    // reachable site into a dead one.
    return cached || Response.error();
  }
}

if (typeof self !== 'undefined' && typeof self.skipWaiting === 'function') {
  self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      // One at a time, and a failure is survivable: addAll is all-or-nothing,
      // and one file that 404s or redirects would otherwise mean no worker at
      // all — installed silently, with nothing on any screen to say so.
      await Promise.all(PRECACHE.map((path) => cache.add(path).catch(() => {})));
      await self.skipWaiting();
    })());
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      await self.clients.claim();
    })());
  });

  self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (passThrough(url.pathname)) return;

    if (request.mode === 'navigate') {
      const document = documentFor(url.pathname);
      if (document) event.respondWith(networkFirst(request, document));
      return;
    }

    if (PRECACHE.includes(url.pathname)) {
      event.respondWith(networkFirst(request, url.pathname));
    }
  });
}
