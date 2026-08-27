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

Design complete. No code yet. Slice 00 is blocked on due-outs D-01 through
D-06 — the Cloudflare account, the two D1 databases, the R2 bucket, and the
GitHub secrets.

Eleven open questions outstanding. Four of them (Q-01 through Q-04) change the
schema or a secret and are the expensive ones to answer late.
