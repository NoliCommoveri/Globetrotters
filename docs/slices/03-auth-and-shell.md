# Slice 03 — Auth, identity, and the shell

**Status:** built · except the fonts, which wait on D-10
**Band:** M
**Implements:** §2 (auth, identity), §11
**Depends on:** 02

**Goal.** Three steps, once per device, and then never a login screen again for
nine months.

---

## Due-outs

- **D-10** The two font files, licensed for self-hosting: a condensed grotesque
  for display and a plain humanist sans for body and prompts, both with tabular
  numerals (§11). **Outstanding.** The shell ships on a system stack; the swap
  point is an `@font-face` pair at the top of `public/css/app.css` and the two
  values of `--font-display` and `--font-body`. The type scale under them is
  tuned to a system sans and wants re-tuning to the real faces.
- **D-09** The three ink colors — done in slice 02, used here as `--ink`

## Open questions

None. Two decisions were settled here and written into `DESIGN.md` §15: which
route sets the person (`PATCH /api/me`, not a second field on `POST /api/auth`),
and whether the shell is a static file or Worker-rendered (static).

## What it built

- `POST /api/auth` — passcode → signed cookie, `HttpOnly; Secure; SameSite=Lax;
  Path=/`, max-age one year, HMAC-SHA-256 over `ADMIN_TOKEN`. `src/api/auth.js`
- The cookie is **re-issued on every authenticated response**, so the year
  slides forward and never expires mid-project. `src/index.js`
- `PATCH /api/me` writes `person_id` into that same signed cookie, server-side
  — not `localStorage`, where Safari's seven-day cap on script-writable storage
  would quietly forget who someone is over spring break while leaving them
  logged in. The signature covers the person id, so an edited cookie fails
  rather than becoming someone else
- `GET /api/me` — the three people, this device's person, and every active plan.
  A person id naming nobody comes back as `null`, which sends the device to the
  picker rather than to a screen with no owner. `src/api/me.js`
- The gate is a route table: `POST /api/auth` answers without a cookie and
  everything else under `/api/` does not, so a route added in a later slice is
  behind the passcode by construction. `401` comes before `404`
- Frontend shell, buildless: `public/index.html`, `css/app.css`, and three
  modules — `js/api.js`, `js/router.js`, `js/app.js`
- Design tokens: deep ink navy ground, chart-paper off-white, and `--ink`, set
  from the current person's `people.color` and cleared when nobody is picked.
  Nothing else is colorful
- Tabular lining numerals on `:root`
- Refetch on launch, on `visibilitychange`, and on a `pageshow` from the
  back-forward cache — the case iOS Safari restores without ever hiding the tab
- Person switcher in settings, not the header
- Empty state: "Pick a country to start September"
- Visible focus rings, `prefers-reduced-motion` respected, 360px

**Fonts are the exception.** `--font-display` and `--font-body` point at the
system stack until D-10 lands. No third-party request on any page load either
way — verified in a browser, one host contacted.

## Exit criteria

- **Pass** — passcode → person → empty state, driven in Chromium at 360px
- **Pass** — reloading lands on the empty state with no passcode
- **Pass** — clearing the cookie returns you to the passcode, and nothing else
  does
- **Not met, D-10** — the fonts are the system stack, not the Worker's assets.
  The half of this that can pass does: one host is contacted on every page load,
  and it is the app's own
- **Pass** — nothing in the shipped assets renders a link to `/admin`

## Do not build

- Month setup. Slice 04. The empty state's button is there and disabled, which
  is what "points at it and goes nowhere yet" looks like.
- The wall's cookie. Different cookie type, slice 07.
- Roles, permissions, or any per-person gating. There are no roles, forever
  (§1).
