// The install and the cache. Three things go wrong here silently and none of
// them shows up on a screen: a file added to public/ and not precached, a
// client route the Worker knows and the worker does not, and a manifest that
// Chrome quietly refuses to offer an install for.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { registerHooks } from 'node:module';

import { VERSION, CACHE, PRECACHE, NOT_PRECACHED, SHELL_PATHS, SHELL_PATTERNS, documentFor }
  from '../public/sw.js';

// src/index.js pulls in the `.sql` bundles, which exist only inside wrangler.
// The same hook test/routes.test.js uses, for the same reason.
registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith('.sql')) return nextLoad(url, context);
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(readFileSync(new URL(url), 'utf8'))};`,
    };
  },
});

const worker = await import('../src/index.js');

const manifest = (file) => JSON.parse(readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'));
const read = (path) => readFileSync(new URL(`../public${path}`, import.meta.url), 'utf8');

// Everything under public/, as paths the browser would ask for.
function assetPaths(dir = '', prefix = '') {
  const entries = readdirSync(new URL(`../public/${dir}`, import.meta.url), { withFileTypes: true });
  return entries.flatMap((entry) => (entry.isDirectory()
    ? assetPaths(`${dir}${entry.name}/`, `${prefix}/${entry.name}`)
    : [`${prefix}/${entry.name}`]));
}

test('every file under public/ is either precached or listed as deliberately not', () => {
  const onDisk = assetPaths().filter((p) => p !== '/sw.js').sort();
  const accounted = [...PRECACHE, ...NOT_PRECACHED].sort();
  assert.deepEqual(onDisk, accounted);
});

test('nothing is precached twice, and everything precached exists', () => {
  assert.equal(new Set(PRECACHE).size, PRECACHE.length);
  for (const path of PRECACHE) assert.doesNotThrow(() => read(path), path);
});

test('the cache name carries the version', () => {
  assert.match(VERSION, /^v\d+$/);
  assert.equal(CACHE, `globetrotters-${VERSION}`);
});

test('the worker and the Worker agree on what a client route is', () => {
  assert.deepEqual([...SHELL_PATHS].sort(), [...worker.SHELL_PATHS].sort());
  assert.deepEqual(
    SHELL_PATTERNS.map(String),
    worker.SHELL_PATTERNS.map(String),
  );
});

test('a navigation is answered from the cache only where the shell owns it', () => {
  assert.equal(documentFor('/'), '/index.html');
  assert.equal(documentFor('/passport'), '/index.html');
  assert.equal(documentFor('/plan/12'), '/index.html');
  assert.equal(documentFor('/wall'), '/wall.html');

  // The Worker renders these, and a cached shell served over one of them would
  // replace the admin page or a month's worksheets with the family app.
  assert.equal(documentFor('/admin'), null);
  assert.equal(documentFor('/admin/health'), null);
  assert.equal(documentFor('/print/12'), null);
  assert.equal(documentFor('/plan/twelve'), null);
  assert.equal(documentFor('/api/me'), null);
});

test('both manifests carry what Chrome needs to offer an install', () => {
  for (const file of ['manifest.webmanifest', 'wall.webmanifest']) {
    const m = manifest(file);
    assert.ok(m.name, `${file}: name`);
    assert.ok(m.start_url, `${file}: start_url`);
    assert.ok(['standalone', 'fullscreen', 'minimal-ui'].includes(m.display), `${file}: display`);
    assert.ok(m.icons.length >= 1, `${file}: icons`);
    for (const icon of m.icons) assert.doesNotThrow(() => read(icon.src), `${file}: ${icon.src}`);
    assert.ok(m.icons.some((i) => i.purpose === 'maskable'), `${file}: a maskable icon`);
    // The two documents launch as two apps. Same id, and installing the second
    // one just reopens the first.
    assert.ok(m.id, `${file}: id`);
  }
  assert.notEqual(manifest('manifest.webmanifest').id, manifest('wall.webmanifest').id);
});

test('the wall installs onto the wall and the shell onto the app', () => {
  assert.equal(manifest('manifest.webmanifest').start_url, '/');
  assert.equal(manifest('wall.webmanifest').start_url, '/wall');
});

test('both documents link a manifest and register the worker', () => {
  for (const [file, mf] of [['/index.html', '/manifest.webmanifest'], ['/wall.html', '/wall.webmanifest']]) {
    const html = read(file);
    assert.match(html, new RegExp(`rel="manifest" href="${mf}"`), file);
    assert.match(html, /src="\/js\/sw-register\.js"/, file);
    // The apple-* meta tags are gone: every device in this family is Android.
    assert.doesNotMatch(html, /apple-mobile-web-app/, file);
  }
});

test('the theme color is the shell\'s navy, in both documents and both manifests', () => {
  for (const file of ['/index.html', '/wall.html']) {
    assert.match(read(file), /<meta name="theme-color" content="#0F1C2E">/, file);
  }
  for (const file of ['manifest.webmanifest', 'wall.webmanifest']) {
    assert.equal(manifest(file).theme_color, '#0F1C2E', file);
  }
});
