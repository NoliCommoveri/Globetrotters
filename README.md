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
| `src/` | The Worker: entry and routing, `/admin`, `lib/`, `migrations/` |
| `test/` | `node --test test/*.test.js` — no dependencies, no install |

## Where things stand

**Slices 00 and 01 are built.** A commit on `main` becomes a running Worker with
no terminal step, and `/admin` — behind `ADMIN_TOKEN`, linked from nowhere —
lists the migrations, applies the pending ones, and shows schema version and
row counts on `/admin/health`. `001_schema.sql` carries every table in §5.

**Slice 02 is built.** `/admin` now also has **Run seed** and the people editor:
three names and three inks, changed in a browser. `002_seed.sql` carries the
three people, six focuses, six project types, 195 countries, 27 task templates
and 17 focus weights — enough library to draw a real month. `GET /api/catalog`
serves the picker's one fetch with an ETag, so a row corrected in the editor
reaches a device that already cached it.

Seed files are not migrations. `src/migrations/index.js` exports `MIGRATIONS` —
checksummed, applied once — and `SEEDS` — re-run in full on every press, every
insert `ON CONFLICT DO NOTHING`. That is what lets the seed grow later without
reading as drift, and what makes a correction in the library editor permanent.

**Slice 03 is next** — the family passcode, the person picker and the shell. Its
due-out D-10, two self-hosted font files, is outstanding and has a lead time.

Every Cloudflare due-out is closed, and so are the three inks. Two remain: the
fonts (D-10) and the month the school year starts (D-12, slice 04).

Six open questions outstanding, none of them blocking slice 03.

The Worker's own tests run with `node --test test/*.test.js` and need nothing
installed. They are a build-session tool, not something the owner ever runs —
nothing about operating this app requires a terminal.
