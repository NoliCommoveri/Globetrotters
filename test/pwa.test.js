// The install and the offline cache. Three things go wrong here silently, and
// none of them shows up on a screen: a file added to public/ and never cached,
// a client route the Worker knows and the worker does not, and a manifest
// Chrome quietly declines to offer an install for.
//
// public/sw.js is a classic worker script, so it is run here in a stub worker
// scope rather than imported. That also lets the fetch handler be exercised: a
// worker that intercepts /admin or /api is the failure this file exists for.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../public${path}`, import.meta.url), 'utf8');
const readBytes = (path) => readFileSync(new URL(`../public${path}`, import.meta.url));
const manifest = (file) => JSON.parse(read(`/${file}`));

// The two documents are cached as the URLs they are navigated to, not as the
// files they are on disk.
const AS_NAVIGATED = { '/index.html': '/', '/wall.html': '/wall' };

function assetPaths(dir = '', prefix = '') {
  const entries = readdirSync(new URL(`../public/${dir}`, import.meta.url), { withFileTypes: true });
  return entries.flatMap((entry) => (entry.isDirectory()
    ? assetPaths(`${dir}${entry.name}/`, `${prefix}/${entry.name}`)
    : [`${prefix}/${entry.name}`]));
}

// Run sw.js in a stub worker scope and hand back its listeners and constants.
function loadWorker() {
  const listeners = {};
  const self = {
    location: { origin: 'https://example.test' },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  const run = new Function(
    'self', 'caches', 'fetch', 'Response',
    `${source}\nreturn { CACHE_VERSION, CACHE_NAME, PRECACHE, NOT_PRECACHED, documentFor, passThrough };`,
  );
  const api = run(self, { open: async () => ({}), match: async () => null, keys: async () => [] }, async () => {},
    { error: () => 'network-error' });
  return { ...api, listeners };
}

const sw = loadWorker();

// What the fetch handler does with one request: the cache key it would answer
// from, or null when it does not intercept at all.
function handle(pathname, { mode = 'navigate', method = 'GET', origin = 'https://example.test' } = {}) {
  let responded = null;
  sw.listeners.fetch({
    request: { method, mode, url: `${origin}${pathname}` },
    respondWith: (value) => { responded = value; },
  });
  return responded;
}

test('every file under public/ is either precached or listed as deliberately not', () => {
  const onDisk = assetPaths()
    .filter((p) => p !== '/sw.js')
    .map((p) => AS_NAVIGATED[p] || p)
    .sort();
  assert.deepEqual(onDisk, [...sw.PRECACHE, ...sw.NOT_PRECACHED].sort());
});

test('nothing is precached twice, and every precached file exists', () => {
  assert.equal(new Set(sw.PRECACHE).size, sw.PRECACHE.length);
  const onDisk = new Set(assetPaths());
  for (const path of sw.PRECACHE) {
    const file = Object.keys(AS_NAVIGATED).find((f) => AS_NAVIGATED[f] === path) || path;
    assert.ok(onDisk.has(file), path);
  }
});

test('the cache name carries the version', () => {
  assert.match(sw.CACHE_VERSION, /^v\d+$/);
  assert.equal(sw.CACHE_NAME, `globetrotters-${sw.CACHE_VERSION}`);
});

test('the worker and the Worker agree on what a client route is', () => {
  // src/index.js is not imported — it pulls in the .sql bundles — so its list
  // is read as text. A route in one file and not the other is a screen that
  // works online and has no offline answer.
  const worker = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const paths = /const SHELL_PATHS = new Set\(\[([^\]]*)\]\)/.exec(worker);
  assert.ok(paths, 'SHELL_PATHS not found in src/index.js');
  const declared = paths[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
  for (const path of declared) assert.ok(sw.documentFor(path), `no offline document for ${path}`);
  assert.match(worker, /SHELL_PATTERNS = \[\/\^\\\/plan\\\/\\d\+\$\/\]/);
  assert.equal(sw.documentFor('/plan/12'), '/');
});

test('a navigation falls back to the cache only where the shell owns it', () => {
  assert.equal(sw.documentFor('/'), '/');
  assert.equal(sw.documentFor('/passport'), '/');
  assert.equal(sw.documentFor('/wall'), '/wall');
  assert.equal(sw.documentFor('/plan/twelve'), null);
});

test('the Worker-rendered paths are never intercepted', () => {
  // A cached shell served over /admin or /print replaces the page with the
  // family app, and a cached /api response is a plan that disagrees with the
  // one the other phone just checked off.
  for (const path of ['/admin', '/admin/health', '/print/12', '/api/me', '/api']) {
    assert.equal(sw.passThrough(path) || sw.documentFor(path) === null, true, path);
    assert.equal(handle(path), null, path);
    assert.equal(handle(path, { mode: 'cors' }), null, path);
  }
});

test('the shell and its assets are answered, and nothing else is', () => {
  assert.ok(handle('/'));
  assert.ok(handle('/settings'));
  assert.ok(handle('/css/app.css', { mode: 'cors' }));
  assert.equal(handle('/css/print.css', { mode: 'cors' }), null);
  // A write, and a request to another origin, are left alone.
  assert.equal(handle('/', { method: 'POST' }), null);
  assert.equal(handle('/', { origin: 'https://elsewhere.test' }), null);
});

test('both manifests carry what Chrome needs to offer an install', () => {
  for (const file of ['manifest.json', 'wall-manifest.json']) {
    const m = manifest(file);
    assert.ok(m.name, `${file}: name`);
    assert.ok(m.id, `${file}: id`);
    assert.ok(['standalone', 'fullscreen', 'minimal-ui'].includes(m.display), `${file}: display`);
    // Chrome's install offer wants a 192px icon or larger, at a declared size.
    const sizes = m.icons.map((i) => Number(i.sizes.split('x')[0]));
    assert.ok(sizes.some((s) => s >= 192), `${file}: an icon of 192px or more`);
    assert.ok(m.icons.some((i) => i.purpose === 'maskable'), `${file}: a maskable icon`);
    for (const icon of m.icons) {
      const bytes = readBytes(icon.src);
      assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], icon.src);
      // The declared size is the actual size, read out of the PNG header.
      const declared = Number(icon.sizes.split('x')[0]);
      assert.equal(bytes.readUInt32BE(16), declared, `${icon.src}: width`);
      assert.equal(bytes.readUInt32BE(20), declared, `${icon.src}: height`);
      assert.ok(sw.PRECACHE.includes(icon.src), `${icon.src} is not cached`);
    }
  }
  assert.notEqual(manifest('manifest.json').id, manifest('wall-manifest.json').id);
  assert.equal(manifest('manifest.json').start_url, '/');
  assert.equal(manifest('wall-manifest.json').start_url, '/wall');
});

test('both documents link a manifest and register the worker', () => {
  for (const [file, mf] of [['/index.html', '/manifest.json'], ['/wall.html', '/wall-manifest.json']]) {
    const html = read(file);
    assert.match(html, new RegExp(`rel="manifest" href="${mf}"`), file);
    assert.match(html, /src="\/js\/sw-register\.js"/, file);
    // The apple-* meta tags are gone: every device in this family is Android.
    assert.doesNotMatch(html, /apple-mobile-web-app/, file);
    assert.match(html, /<meta name="theme-color" content="#0F1C2E">/, file);
  }
  // sw-register.js is a classic script: it has no imports, and a module would
  // defer it behind the shell for no reason.
  assert.doesNotMatch(read('/index.html'), /type="module" src="\/js\/sw-register\.js"/);
});

test('the theme color matches the manifests', () => {
  for (const file of ['manifest.json', 'wall-manifest.json']) {
    assert.equal(manifest(file).theme_color, '#0F1C2E', file);
    assert.equal(manifest(file).background_color, '#0F1C2E', file);
  }
});
