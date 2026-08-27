# Slice 02 — Seed v0 and catalog

**Status:** built
**Band:** M
**Implements:** §13 (partial — v0 sizing below), §6 (catalog, people)
**Depends on:** 01

**Goal.** Enough library to draw a real month, and the family named.

---

## Due-outs

Both closed.

- **D-09** Three inks: `#5B2A86` deep purple, `#D07AC0` lilac, `#2E6FD9` blue.
  Seeded, and editable on `/admin` where the names are typed.
- **D-11** `FAMILY_TZ` — `America/Chicago`.

## Open questions

Both answered, and written into `DESIGN.md`.

- **Q-04** — placeholders. The seed writes three people with explicit ids and
  `/admin` renames them; §3's "not seeded from SQL" sentence was the half that
  was wrong.
- **Q-05** — an ETag over the response body with `Cache-Control: no-cache`.

## Build

- `002_seed.sql`, `INSERT ... ON CONFLICT DO NOTHING` throughout on the row's
  stable key — `slug`, `iso3` for a country, `id` for a person — so once a row
  exists the seed leaves it alone forever and re-runs never clobber edits
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

## Seeds are not migrations

`src/migrations/index.js` exports two lists. `MIGRATIONS` is checksummed,
append-only and applied once by Apply pending; `SEEDS` is re-executed in full by
Run seed on every press. A seed file must not be checksummed: slice 09 adds ~63
task templates and all of `003_country_data.sql` to a database that is already
seeded and already carries real work, and under the checksum rule that edit
reads as permanent drift with Apply pending refusing to run it. `ON CONFLICT DO
NOTHING` is what makes re-execution safe, and it is the same property that lets
a library-editor correction survive.

## Exit criteria

| Criterion | State |
|---|---|
| Seed runs twice; the second run inserts zero and changes nothing | met |
| Editing a seeded task's title, then re-running the seed, leaves the edit | met |
| Renaming a person on `/admin` sticks and does not require touching SQL | met |
| `/api/catalog` returns and is under ~60KB | met — 22.7KB with all 195 countries |
| Every focus has at least one `weight = 3` row in weeks 2–3 | **not met** — needs the content |
| 195 countries | met |
| 27 task templates in a 6 / 8 / 8 / 5 split | **not met** — needs the content |

The unmet ones are asserted in `test/seed-content.test.js`, which fails today
and names what is missing on each run. The slice is `built` when that file is
green.

## What is outstanding

**27 task templates and their focus weights**, being written by the owner.
Column rules, allowed values and paste-ready row forms are in
`../other/SEED-CONTENT.md`. The rows go into `002_seed.sql` at the two marked
places; nothing else has to change, and Run seed loads them into a database that
is already seeded without touching anything already in it.

## Do not build

- Hooks or focus affinities. `003_country_data.sql` is slice 09; countries seed
  here unadorned.
- The remaining ~63 task templates. Slice 09.
- Any kid-facing screen.
