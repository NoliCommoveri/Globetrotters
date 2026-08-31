# Slice 24 — The install

**Status:** built
**Band:** M
**Implements:** §2 (the install and the offline copy), §15
**Depends on:** 07

**Goal.** The app installs from Chrome onto a home screen, launches with no
address bar, and opens with no signal. The wall installs as its own app on the
tablet.

**What it replaces.** Three `apple-mobile-web-app-*` meta tags, written when the
device was unknown. Every device in this family is Android, so they were doing
nothing, and Chrome's install offer needs a manifest and an icon, neither of
which existed. A phone in the driveway with no bars got the browser's error
page.

---

## Due-outs

None. D-10 (the fonts) and D-14 (the wall tablet) are outstanding and neither
touches this: the icon is drawn in the shell's own two colors and carries no
type, and the install works on whatever Android tablet D-14 turns out to name.

## Open questions

Both answered before the code. See `../other/OPEN-QUESTIONS.md` Q-23, Q-24.

- **Q-23 — what the app does with no signal.** It opens, and nothing more. The
  shell is kept; nothing under `/api/` ever is.
- **Q-24 — where the icon comes from.** Drawn here: one SVG, three PNGs
  rasterized from it. No due-out, no build step.

## The rule

**Network first, and the cache is a fallback.** Every request the worker handles
goes to the network; what comes back is written to the cache and returned. The
cache answers only when the network throws. Two consequences, and both are the
reason for the choice: an online device can never be served an app that is
deploys behind, and a mistake in the cache cannot make a reachable site
unreachable. The cost is the cold-open speed a cache-first shell would have,
which this app does not need — the shell is one small document on a fast edge,
and the offline copy exists for a car and a driveway.

**The cache holds one version's files.** `PRECACHE` in `public/sw.js` lists
every file under `public/` bar two, as the URLs the browser asks for: the two
documents are `/` and `/wall`, not `/index.html` and `/wall.html`, because the
assets server redirects the second form to the first and a redirect cannot be
cached. `NOT_PRECACHED` names the two exclusions and why.

**Precaching is per file and survivable.** `cache.addAll` is all-or-nothing: one
path that 404s or redirects means no worker installs at all, silently, with
nothing on any screen to say so. Each file is added on its own and a failure is
swallowed; the network answers for whatever is missing.

**Nothing under `/api/`, `/admin` or `/print/` is intercepted.** Not cached,
not answered, not touched — those requests behave exactly as they would with no
worker installed. A cached shell served over `/admin` or a month's worksheets
replaces the page with the family app.

**`CACHE_VERSION` moves in the same commit as any change under `public/`.** The
offline copy is rebuilt whole only when the cache name changes. A missed bump
leaves an offline device with the old copy of what changed, and leaves a
renamed or deleted file in the cache until a later bump evicts it; an online
device is unaffected, because it is reading from the network. Written into
`CLAUDE.md` as a directive because no test can check it.

**The client arranges nothing.** `sw-register.js` registers the worker and stops.
The worker skips waiting on install and claims its clients on activate, so the
next launch is the new version. No update banner, no reload: a page that reloads
itself under a kid mid-tap is worse than a screen one launch behind.

## Build

1. **`public/sw.js`** — a classic worker script. `CACHE_VERSION`, `CACHE_NAME`,
   `PRECACHE`, `NOT_PRECACHED`, `documentFor()`, `passThrough()`,
   `networkFirst()`, and the three listeners.
2. **`public/js/sw-register.js`** — four lines, loaded as a classic script by
   both documents.
3. **`public/manifest.json`** — the shell at `/`, standalone, portrait.
4. **`public/wall-manifest.json`** — the wall at `/wall`, fullscreen, landscape,
   a distinct `id`, so the tablet installs a second app rather than reopening
   the first.
5. **`public/icon.svg`** and the three PNGs rasterized from it —
   `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
6. **`public/index.html`, `public/wall.html`** — the manifest link, the icon
   link, the registration script; the three `apple-*` meta tags deleted.
7. **`test/pwa.test.js`** — the precache list against the directory, the shell
   routes against `src/index.js`, the manifests against what Chrome's install
   offer needs, and the fetch handler itself: `sw.js` is run in a stub worker
   scope and asked what it would do with `/admin`, `/api/me` and `/print/12`.
8. **`CLAUDE.md`, `DESIGN.md` §2 and §15, `README.md`** — the version-bump rule.

**Nothing under `src/`.** The Worker is untouched by this slice, and the test
reads `src/index.js` as text rather than importing it, so the deploy is
unchanged by everything above.

## Exit criteria

- Chrome on Android offers **Install app** on `/`, and the installed app opens
  at `/` with no address bar.
- The tablet installs `/wall` separately, and it launches fullscreen.
- Airplane mode: the installed app opens on its own screens and says *Cannot
  reach Globetrotters* where the data goes.
- With the worker installed, a deploy reaches the phone on the next launch
  without a version bump — the network answered.
- `/admin` and `/print/:planId` still render from the Worker.
- A file added under `public/` and left out of `PRECACHE` fails
  `test/pwa.test.js`.
- `node --test test/*.test.js` green.

## Do not build

**A cache of anything under `/api/`.** Q-23. Stale plans are worse than a
message saying there is no signal.

**Queued offline check-offs.** Same question. A write queue needs a conflict
story against §2's several-devices rule, and the wifi reaches the kitchen table.

**A cache-first shell.** It is faster and it is the version of this worker that
can strand a device, which is a trade this app has no reason to take.

**An in-app install button.** Chrome's own install offer is the install path. A
`beforeinstallprompt` handler is a second one to keep working.

**A push subscription, a badge, or a notification.** Nothing in this app is
urgent. The wall is the ambient surface (§8) and it is already on the wall.

**`apple-*` anything.** No iPhones. If that changes it is a slice, not a
sprinkle of meta tags: iOS has no install prompt, no maskable icon and a
seven-day eviction rule that Q-23 would have to be re-answered against.
