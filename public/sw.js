// The service worker. It caches the two static documents and everything they
// load, so the app opens from the home screen with no network and no white
// flash, and so a phone with no signal shows the app rather than the browser's
// dinosaur (DESIGN.md §2).
//
// ─────────────────────────────────────────────────────────────────────────────
// BUMP `VERSION` IN THE SAME COMMIT AS ANY CHANGE UNDER public/.
//
// An installed device fetches the shell from this cache, not from the network.
// If the bytes of this file do not change, the browser sees no update, the
// cache is never rebuilt, and the change you just deployed never arrives — on
// every installed device, silently, forever. Editing a stylesheet is a two-file
// edit. See CLAUDE.md.
// ─────────────────────────────────────────────────────────────────────────────
export const VERSION = 'v1';
export const CACHE = `globetrotters-${VERSION}`;

// The whole cache, listed rather than crawled: a worker cannot read its own
// directory, and a list is the only way a test can tell that a new module was
// added without being cached.
export const PRECACHE = [
  '/index.html',
  '/wall.html',
  '/manifest.webmanifest',
  '/wall.webmanifest',
  '/icon.svg',
  '/icon-maskable.svg',
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

// The two files under public/ that are deliberately not cached, declared so the
// test can hold PRECACHE to every other file in the directory.
export const NOT_PRECACHED = [
  // Loaded by /print/:planId, which the Worker renders and which therefore
  // needs the network before the stylesheet matters.
  '/css/print.css',
  // For crawlers. Nothing in the app ever fetches it.
  '/robots.txt',
];

// Mirrors SHELL_PATHS and SHELL_PATTERNS in src/index.js — the same routes,
// answered from the cache instead of from the assets binding. A test asserts
// the two agree: a client route added on the Worker and not here works online
// and 404s on a plane, which is the hardest kind of bug to see.
export const SHELL_PATHS = new Set(['/', '/settings', '/setup', '/passport']);
export const SHELL_PATTERNS = [/^\/plan\/\d+$/];

// Which document answers a navigation, or null for a path this worker has no
// business intercepting — /admin, /print/:planId, and anything else the Worker
// owns. Returning null means no respondWith at all, so the request goes to the
// network exactly as it would with no service worker installed.
export function documentFor(pathname) {
  if (pathname === '/wall') return '/wall.html';
  if (SHELL_PATHS.has(pathname)) return '/index.html';
  if (SHELL_PATTERNS.some((p) => p.test(pathname))) return '/index.html';
  return null;
}

// Cache first, network as the fallback for a miss. Nothing is written back: the
// cache holds exactly one version's files and is rebuilt whole on the next
// bump, so a runtime put would leave a device holding a mix of two deploys.
async function fromCache(path, request) {
  const hit = await caches.match(path, { cacheName: CACHE });
  return hit || fetch(request);
}

async function precache() {
  const cache = await caches.open(CACHE);
  // `reload` skips the HTTP cache, so a fresh install cannot pick up a file the
  // browser happens to be holding from the deploy before this one.
  await cache.addAll(PRECACHE.map((path) => new Request(path, { cache: 'reload' })));
}

async function dropOldCaches() {
  const names = await caches.keys();
  await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
}

// Guarded so `node --test` can import the lists above. Everything below runs
// only inside a service worker.
if (typeof self !== 'undefined' && typeof self.skipWaiting === 'function') {
  self.addEventListener('install', (event) => {
    event.waitUntil(precache());
  });

  self.addEventListener('activate', (event) => {
    // claim() so the first launch after an install is already controlled,
    // rather than running uncached until the tab is closed and reopened.
    event.waitUntil(dropOldCaches().then(() => self.clients.claim()));
  });

  // The page asks for the swap; this worker never takes it by itself. A worker
  // that calls skipWaiting on install swaps the shell's modules underneath a
  // screen that is already running (/js/sw-register.js).
  self.addEventListener('message', (event) => {
    if (event.data === 'skip-waiting') self.skipWaiting();
  });

  self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Nothing under /api/ is cached, ever (Q-23). The app is online-only for
    // data; a cached plan is a plan that disagrees with the one the kid checked
    // off on the other phone.
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

    if (request.mode === 'navigate') {
      const document = documentFor(url.pathname);
      if (document) event.respondWith(fromCache(document, request));
      return;
    }

    if (PRECACHE.includes(url.pathname)) event.respondWith(fromCache(url.pathname, request));
  });
}
