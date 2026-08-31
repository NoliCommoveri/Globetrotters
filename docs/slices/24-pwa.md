# Slice 24 — The install

**Status:** built
**Band:** M
**Implements:** §2 (the install and the shell cache), §15
**Depends on:** 07

**Goal.** The app installs from Chrome onto a home screen, launches with no
address bar, and opens with no signal. The wall installs as its own app on the
tablet.

**What it replaces.** Three `apple-mobile-web-app-*` meta tags, written when the
device was unknown. Every device in this family is Android, so they were doing
nothing, and Chrome's install offer needs a manifest and an icon, neither of
which existed. A phone in the driveway with no bars got the browser's offline
page.

---

## Due-outs

None. D-10 (the fonts) and D-14 (the wall tablet) are outstanding and neither
touches this: the icon is drawn in the shell's own two colors and carries no
type, and the install works on whatever Android tablet D-14 turns out to name.

## Open questions

Both answered before the code. See `../other/OPEN-QUESTIONS.md` Q-23, Q-24.

- **Q-23 — what the app does with no signal.** It opens, and nothing more. The
  shell is cached; nothing under `/api/` ever is.
- **Q-24 — where the icon comes from.** Drawn here, in SVG. No binary asset, no
  build step, no due-out.

## The rule

**The cache holds one version's files, whole.** `PRECACHE` in `public/sw.js`
lists every file under `public/` bar two, and `NOT_PRECACHED` names those two
and why. Nothing is written to the cache at runtime: a device holds one deploy's
assets or the next one's, never a mixture.

**Nothing under `/api/` is cached, and no response is stored on the way past.**
The app is online-only for data (Q-23). `public/js/api.js` already says *Cannot
reach Globetrotters* on a failed fetch, and that message is now the whole
offline story — reached instantly, from an app that opened.

**The worker answers a navigation only where the shell owns the route.**
`documentFor()` mirrors `SHELL_PATHS` and `SHELL_PATTERNS` in `src/index.js`,
plus `/wall`. `/admin` and `/print/:planId` are Worker-rendered and pass through
untouched — a cached shell served over either replaces the page with the family
app, and the print path is the one a parent hits at the printer.

**A new worker activates out of sight.** `sw.js` never calls `skipWaiting()` on
its own; `public/js/sw-register.js` asks for the swap when the document goes
hidden and reloads on `controllerchange`, so the reload lands on a backgrounded
tab and the next launch is the new code. The wall is never hidden and has no
state to lose, so it takes the swap the moment one is waiting.

**`VERSION` moves in the same commit as any change under `public/`.** This is
the whole cost of a cache-first shell with no build step, and it is written into
`CLAUDE.md` as a directive because no test can check it: a forgotten bump
deploys successfully, reports the new version id on `/admin/health`, and reaches
none of the three phones.

## Build

1. **`public/sw.js`** — `VERSION`, `CACHE`, `PRECACHE`, `NOT_PRECACHED`,
   `SHELL_PATHS`/`SHELL_PATTERNS`/`documentFor()`, and the four listeners behind
   a `typeof self` guard so the lists can be imported by the test. A module
   worker: registered with `{ type: 'module' }`, which Chrome has taken since
   91.
2. **`public/js/sw-register.js`** — registration with `updateViaCache: 'none'`,
   the update check on becoming visible, the swap on going hidden, and the
   one-shot reload. Loaded by both documents; it reads `body.wall` to tell which
   of the two it is in.
3. **`public/manifest.webmanifest`** — the shell at `/`, standalone, portrait.
4. **`public/wall.webmanifest`** — the wall at `/wall`, fullscreen, landscape, a
   distinct `id`, so the tablet installs a second app rather than reopening the
   first.
5. **`public/icon.svg`, `public/icon-maskable.svg`** — a globe in `--paper` on
   `--navy`. The maskable pair sits inside the safe circle Android crops to.
6. **`public/index.html`, `public/wall.html`** — the manifest link, the icon
   link, the registration script; the three `apple-*` meta tags deleted.
7. **`src/index.js`** — `SHELL_PATHS` and `SHELL_PATTERNS` exported, so the test
   can hold them against the worker's copy.
8. **`test/pwa.test.js`** — the precache list against the directory, the two
   route lists against each other, `documentFor()` on the paths that must pass
   through, and both manifests.
9. **`CLAUDE.md`, `DESIGN.md` §2 and §15, `README.md`** — the version-bump rule.

## Exit criteria

- Chrome on Android offers **Install app** on `/`, and the installed app opens
  at `/` with no address bar.
- The tablet installs `/wall` separately, and it launches fullscreen.
- Airplane mode: the installed app opens on its own screens and says *Cannot
  reach Globetrotters* where the data goes. It does not show the browser's
  offline page.
- `/admin` and `/print/:planId` still render from the Worker with the worker
  installed.
- A file added under `public/` and left out of `PRECACHE` fails
  `test/pwa.test.js`.
- `node --test test/*.test.js` green.

## Do not build

**A cache of anything under `/api/`.** Q-23. Stale plans are worse than a
message saying there is no signal.

**Queued offline check-offs.** Same question. A write queue needs a conflict
story against §2's several-devices rule, and the wifi reaches the kitchen table.

**An in-app install button.** Chrome's own install offer is the install path.
A `beforeinstallprompt` handler is a second one to keep working.

**A push subscription, a badge, or a notification.** Nothing in this app is
urgent. The wall is the ambient surface (§8) and it is already on the wall.

**`apple-*` anything.** No iPhones. If that changes it is a slice, not a
sprinkle of meta tags: iOS has no install prompt, no maskable icon and a
seven-day eviction rule that the whole of Q-23 would have to be re-answered
against.
