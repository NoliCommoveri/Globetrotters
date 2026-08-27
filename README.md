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

## Where things stand

**Slice 00 is built and deployed.** A commit on `main` becomes a running Worker
with no terminal step, and `/admin/health` on `globetrotters.immotus.app`
reports D1 reachable and the `.sql` text rule working — which is what slice 01's
migration runner rests on.

Every Cloudflare due-out is closed: the D1 database, the git-connected Worker
`globetrotters`, all three Worker secrets, and the custom domain.

**Slice 01 is next** and has no open questions: the migration runner, the
`ADMIN_TOKEN` gate on `/admin`, and `001_schema.sql`.

Nine open questions outstanding. One of them, Q-04, changes the schema and is
the expensive one to answer late.
