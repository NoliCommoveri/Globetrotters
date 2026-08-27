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
| `docs/other/OPEN-QUESTIONS.md` | Questions blocking build, and answered ones |
| `src/` | The Worker: entry and routing, `/admin`, `lib/`, `migrations/` |
| `test/` | `node --test test/*.test.js` — no dependencies, no install |

## Where things stand

**Slices 00 and 01 are built.** A commit on `main` becomes a running Worker with
no terminal step, and `/admin` — behind `ADMIN_TOKEN`, linked from nowhere —
lists the migrations, applies the pending ones, and shows schema version and
row counts on `/admin/health`. `001_schema.sql` carries every table in §5.

Every Cloudflare due-out is closed: the D1 database, the git-connected Worker
`globetrotters`, all three Worker secrets, and the custom domain.

**Slice 02 is next.** It has one open question that has to be answered first —
Q-04, whether people are seeded as placeholders or created on `/admin`.

Eight open questions outstanding.

The Worker's own tests run with `node --test test/*.test.js` and need nothing
installed. They are a build-session tool, not something the owner ever runs —
nothing about operating this app requires a terminal.
