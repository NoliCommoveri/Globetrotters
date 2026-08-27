# Slice 03 — Auth, identity, and the shell

**Status:** not started
**Band:** M
**Implements:** §2 (auth, identity), §11
**Depends on:** 02

**Goal.** Three steps, once per device, and then never a login screen again for
nine months.

---

## Due-outs

- **D-10** The two font files, licensed for self-hosting: a condensed grotesque
  for display and a plain humanist sans for body and prompts, both with tabular
  numerals (§11). Self-hosting means a webfont license that permits it. This is
  the one due-out with a cost and a lead time, and the shell cannot be finished
  without it.
- **D-09** The three ink colors, if not already settled in slice 02

The shell can be built against system fonts and swapped, but the type scale is
tuned to the real faces and tuning it twice is the more expensive path.

## Open questions

None outstanding for this slice.

## Build

- `POST /api/auth` — passcode → signed cookie, `HttpOnly; Secure;
  SameSite=Lax`, max-age one year, HMAC-SHA-256 over `ADMIN_TOKEN`
- The cookie is **re-issued on every authenticated request**, so the year
  slides forward and never expires mid-project
- Person selection writes `person_id` into that same signed cookie, server-side
  — not `localStorage`, where Safari's seven-day cap on script-writable storage
  would quietly forget who someone is over spring break while leaving them
  logged in
- `GET /api/me` — people list plus active plans
- Frontend shell: buildless vanilla JS plus a small router. Three users, five
  screens — a bundler is overhead. If a framework proves necessary, Vite +
  Preact.
- Both fonts self-hosted in the Worker's assets. No third-party request on any
  page load.
- Design tokens: deep ink navy ground, chart-paper off-white, three stamp inks
  from `people.color` used only for ownership and completion. Nothing else gets
  to be colorful.
- Tabular numerals everywhere
- Refetch on launch and on `visibilitychange`, app-wide
- Person switcher in settings, not the header — it is not a daily control
- Empty state: "Pick a country to start September"
- Visible focus rings, `prefers-reduced-motion` respected, 360px

## Exit criteria

- Passcode → person → empty state, on a real phone, at 360px
- Reloading a week later still lands on the empty state with no passcode
- Clearing the cookie returns you to the passcode, and nothing else does
- Both fonts load from the Worker's own assets — network tab shows no
  third-party host
- Nothing anywhere in the app renders a link to `/admin`

## Do not build

- Month setup. Slice 04. The empty state's copy points at it and goes nowhere
  yet.
- The wall's cookie. Different cookie type, slice 07.
- Roles, permissions, or any per-person gating. There are no roles, forever
  (§1).
