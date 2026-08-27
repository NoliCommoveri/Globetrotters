# Slice 02 — Seed v0 and catalog

**Status:** not started
**Band:** M
**Implements:** §13 (partial — v0 sizing below), §6 (catalog, people)
**Depends on:** 01

**Goal.** Enough library to draw a real month, and the family named.

---

## Due-outs

- **D-09** Three people's names and ink colors. The names can be typed on
  `/admin` after this slice ships, but the three inks are a palette decision
  (§11: three saturated stamp inks against ink navy and chart-paper off-white)
  and placeholder colors that ship are placeholder colors that stay.
- **D-11** `FAMILY_TZ` value confirmed (set in D-08, used from here on) — done,
  `America/Chicago`

## Open questions

- **Q-04** — the people seed contradicts itself. §3 says people "are not seeded
  from SQL"; §13 seeds "3 placeholder people, renamed on `/admin`." A person
  row must exist before anyone can pick themselves, so placeholders plus an
  editor is the workable reading. Confirm, then fix §3's sentence.
- **Q-05** — how does `/api/catalog` invalidate? It is cached client-side and
  the slice 08 country editor edits exactly what it contains. Without an ETag
  or a version field, a fixed hook stays wrong on every device that already
  loaded it. Adding the header costs nothing here and cannot be retrofitted
  into caches already in the wild.

## Build

- `002_seed.sql`, `INSERT ... ON CONFLICT (slug) DO NOTHING` throughout — once
  a row exists the seed leaves it alone forever, so re-runs never clobber edits
  - 6 focuses: `ancient-world`, `wild-places`, `people-and-power`,
    `food-and-craft`, `conflict-and-change`, `land-and-sky`
  - 6 project types: `trifold-board`, `model-or-diorama`, `video`, `skit`,
    `museum-box`, `illustrated-zine`
  - ~195 countries with continent, region, and `research_depth`
  - 3 placeholder people
  - **27 task templates** — see the sizing note
  - `task_focus_weights` rows only where a focus has an opinion (3 on-theme,
    0 to exclude). Neutral tasks get no row.
- `POST /admin/api/seed` — idempotent, reports counts inserted
- `GET /admin/api/people`, `PATCH /admin/api/people/:id` — name, ink color,
  sort order
- `GET /api/catalog` — countries, hooks, affinities, focuses, project types,
  with whatever Q-05 settles on for invalidation

## Seed v0 sizing

§14 calls for a 20-template seed. Twenty does not reach the end of the slice
list:

- Week 4 is 5 templates *per project type*. A 20-template seed covers one
  project type, so setup in slices 04–06 must be restricted to that one type or
  the week-4 sequence comes back empty.
- Weeks 2 and 3 draw 5 without replacement. A 5-template pool draws all of it,
  which leaves swap with no candidates — `UNIQUE (plan_id, task_template_id)`
  excludes everything already drawn. Swap would be untestable until slice 09.

Seed v0 is therefore **27**:

| Week | Templates | Note |
|---|---|---|
| 1 | 6 | 4 `core` (flag, map, location/borders, language) + 2 for the fifth slot |
| 2 | 8 | three spare beyond the five drawn, so swap has candidates |
| 3 | 8 | same |
| 4 | 5 | `trifold-board` only |

The other five project types seed as rows with no week-4 templates and are
hidden in setup until slice 09 fills them.

## Exit criteria

- Seed runs twice; the second run inserts zero and changes nothing
- Editing a seeded task's title, then re-running the seed, leaves the edit
- Renaming a person on `/admin` sticks and does not require touching SQL
- `/api/catalog` returns and is under ~60KB
- Every focus has at least one `weight = 3` row in weeks 2–3, so slice 04's
  focus preview has something to sample

## Do not build

- Hooks or focus affinities. `003_country_data.sql` is slice 09; countries seed
  here unadorned.
- The remaining ~63 task templates. Slice 09.
- Any kid-facing screen.
