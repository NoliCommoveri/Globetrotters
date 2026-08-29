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
  - **37 task templates** — see the sizing note
  - a focus weight for every template a focus has an opinion about. Slice 11
    replaced this with `focus_tags` and `prompt_tags`; see 11-merged-draw.md.
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
  excludes everything already drawn. Swap would have been untestable on it.

Twenty-seven is the floor, and it is the floor for the **draw** — the point
below which a week draws all of itself and Swap has nothing left. Seed v0 is
**37**, because the draw is not the thing that runs out.

Five tasks come out of a week however many are in it, so a deeper pool costs
the kid nothing. What a shallow pool costs is the **focus**: with two on-theme
tasks in a week, both are drawn every month that focus is chosen, and a focus
gets chosen up to nine times. Every focus therefore holds three on-theme tasks
in week 2 and three in week 3 — eighteen focus-weeks, covered by thirteen tasks
a week because a task can be on theme for two focuses at once.

| Week | Templates | Note |
|---|---|---|
| 1 | 6 | 4 `core` (flag, map, location/borders, language & writing system) + 2 for the fifth slot |
| 2 | 13 | eight spare beyond the five drawn, so swap has candidates |
| 3 | 13 | same |
| 4 | 5 | `trifold-board` only |

The other five project types seeded as rows with no week-4 templates and were
hidden in setup. Slice 09 filled all six.

## Seeds are not migrations

`src/migrations/index.js` exports two lists. `MIGRATIONS` is checksummed,
append-only and applied once by Apply pending; `SEEDS` is re-executed in full by
Run seed on every press. A seed file must not be checksummed: slice 09 adds ~53
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
| `/api/catalog` returns and is under ~60KB | met — 22.7KB with all 195 countries and no hooks. Slice 09's content took it to 66.8KB, ~16KB gzipped |
| Every focus has three `weight = 3` rows in week 2 and in week 3 | met — 42 weight rows |
| 195 countries | met |
| 37 task templates in a 6 / 13 / 13 / 5 split | met |

All of it is asserted in `test/seed-content.test.js`, which is green. Each
assertion names what is missing rather than reporting a count, because the draw
in slice 04 cannot report "the pool was one short" — it just produces a thin
month.

## Where v0 was thin on purpose

One gap was left for slice 09, and it has been closed:

- **Week 1's fifth slot had two candidates**, so basic stats, time zones and
  size comparison had no template. `national-symbol` and `currency-animal` split
  that slot between them. Unlike the focus gaps, this one cost nothing to leave:
  the fifth slot is one task a month and both candidates are worth drawing.
  Slice 09 widened the pool to six.

Weeks 2 and 3 no longer have a thin focus. They did — three focuses had a
single week-3 task between them — and it was closed here rather than deferred,
because a focus that hands back the same week every month is the failure this
whole mechanism exists to prevent, and the rows cost nothing to write now.

## Do not build

- Hooks or focus affinities. `003_country_data.sql` is slice 09; countries seed
  here unadorned.
- The remaining ~53 task templates. Slice 09.
- Any kid-facing screen.
