# Globetrotters

Companion app to a family research project: three people — one parent, kids aged
11 and 12 — each research one country per month, September through May, ~10
minutes a day, 5 days a week. Physical looseleaf workbooks hold the actual
written work. This app tracks what has been done, points the way each day, and
holds the shared family passport.

Cloudflare Worker, D1, browser-only migrations. Nothing in setup, migration,
seeding, or deploy requires a terminal.

---

## The map

| Path | What it is |
|---|---|
| `CLAUDE.md` | Directives for every session. Read first. |
| `docs/design/DESIGN.md` | The spec. Each section carries a completion marker. |
| `docs/slices/INDEX.md` | The ten slices, in build order, with status |
| `docs/slices/NN-name.md` | One slice: instructions, due-outs, questions, exit criteria |
| `docs/other/DUE-OUTS.md` | What the owner must provide, by slice |
| `docs/other/SEED-CONTENT.md` | Column rules and row forms for the hand-written seed lists |
| `docs/other/OPEN-QUESTIONS.md` | Questions blocking build, and answered ones |
| `src/` | The Worker: entry and routing, `/api/*`, `/admin`, `lib/`, `migrations/` |
| `public/` | The family app: one static document, one stylesheet, eight JS modules |
| `test/` | `node --test test/*.test.js` — no dependencies, no install |

## Where things stand

**Slices 00 and 01 are built.** A commit on `main` becomes a running Worker with
no terminal step, and `/admin` — behind `ADMIN_TOKEN`, linked from nowhere —
lists the migrations, applies the pending ones, and shows schema version and
row counts on `/admin/health`. `001_schema.sql` carries every table in §5.

**Slice 02 is built.** `/admin` now also has **Run seed** and the people editor:
three names and three inks, changed in a browser. `002_seed.sql` carries the
three people, six focuses, six project types, 195 countries, 37 task templates
and 42 focus weights — enough library to draw a real month, and enough that the
focus a kid picks every month does not hand back the same week every month. `GET /api/catalog`
serves the picker's one fetch with an ETag, so a row corrected in the editor
reaches a device that already cached it.

Seed files are not migrations. `src/migrations/index.js` exports `MIGRATIONS` —
checksummed, applied once — and `SEEDS` — re-run in full on every press, every
insert `ON CONFLICT DO NOTHING`. That is what lets the seed grow later without
reading as drift, and what makes a correction in the library editor permanent.

**Slice 03 is built, except its fonts.** The family passcode gets you in once
per device, `PATCH /api/me` writes which of the three people you are into the
same signed cookie, and the cookie is re-issued on every authenticated response
so its year slides forward instead of expiring in March. Everything under
`/api/` is behind that cookie except `POST /api/auth`, which is what issues it.

The shell is a static `public/index.html` and three vanilla modules — no build
step, no framework, no third-party request on any page load. Passcode → person →
"Pick a country to start September", at 360px.

D-10, the two licensed font files, is outstanding, so the shell runs on a system
stack. Swapping them in is an `@font-face` pair and two token values in
`public/css/app.css`, plus a re-tune of the type scale.

**Slice 04 is built.** A kid picks a country — browse by continent, search all
195, or "Deal me three" — then a focus, then what they will make, and lands on
twenty tasks for the month. The draw lives in `src/lib/draw.js`: four fixed
week-1 tasks plus one drawn, two focus-weighted Deep Dive weeks, and week 4's
project sequence. A focus weight of 0 excludes; everything else is scaled by how
long since that person last drew it, so a task drawn last month scores half a
fresh one and nothing is ever locked out.

Everything on the reveal is free until the first check-off and fixed after it:
redraw, change focus, change what you'll make. Country is free always, because no
task is country-specific. `start_date` is always a Monday — the later of the
month's first Monday and this week's — so a September 20th start lands in week 1
rather than backdating a kid into week 3.

Three things on the setup screen are built and inert until slice 09: the hook
line on a country card, the recommended focuses with their reason lines, and
"Deal me three", which is not offered at all while no country has two hooks.
`002_seed.sql` carries none — they arrive with `003_country_data.sql`.

**Slice 05 is built** — the daily loop, and the screen the app is mostly made
of. This week puts one card up, not five: the lowest-position open task in the
current week, with the prompt at the largest type on the phone and the workbook
page it feeds under it. **Done** completes it and writes a session; **Worked on
it** writes a session and leaves the card open, which is the two-sittings case
the schema was built for. A repeated `done` writes no second session, so days
worked cannot be inflated by a double-tap, and **Undo** leaves the session rows
alone, so it cannot be deflated by a mis-tap either.

Nothing is ever locked out. A missed Tuesday shifts forward, and unfinished
tasks from earlier weeks sit on a carry-forward strip that still checks off in
week 3. Progress is two numbers and no streak: a 0–5 week ring labelled with
what is left — "3 left this week" — and "12 of 20" for the month. Never a
percentage.

Plan holds everything month-scale: all twenty tasks, swap with its remaining
budget, the month's notes accumulating down the page, week 4's materials from
week 1, and days worked.

**Slice 06 is next** — the passport, the completion offer at 20/20, and the
stamp.

Every Cloudflare due-out is closed, and so are the three inks and the school year
(September through May). Two remain: the fonts (D-10), which block nothing, and
the passport's paper size (D-13), which blocks only slice 06's print stylesheet.

Three open questions outstanding, none of them against slice 06.

The Worker's own tests run with `node --test test/*.test.js` and need nothing
installed. They are a build-session tool, not something the owner ever runs —
nothing about operating this app requires a terminal.
