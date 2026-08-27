# Slice 08 — Library editor

**Status:** not started
**Band:** L
**Implements:** §12
**Depends on:** 02

**Goal.** Tuning without a terminal, after watching two kids actually use it.

The library is what determines whether the app is *good*. This slice is what
makes slice 09 something the parent can keep doing all year.

---

## Due-outs

None. Everything this slice needs exists after slice 02.

Best built after slice 05, when there are draw counts worth looking at, but it
does not depend on it.

## Open questions

- **Q-05** — `/api/catalog` invalidation, if slice 02 deferred it. This is the
  slice where a stale catalog becomes visible: fixing a wrong hook here has to
  reach a phone that already cached it.

## Build

Parent-facing, behind `ADMIN_TOKEN`, not part of the kid experience.

- `GET /admin/library`, `GET /admin/api/library`
- **Task list** — every template, filterable by week, tier, focus weight, and
  workbook page. Shows how many times each has been drawn and by whom, so it's
  obvious which ones are dead weight. Inline edit for title, prompt, week,
  tier, workbook page. New tasks default `origin = 'custom'`.
  `POST /admin/api/tasks`, `PATCH /admin/api/tasks/:id`
- **Focus editor** — name, blurb, and the weight grid: that focus against every
  week 2–3 task, each cell cycling `off / 1 / 3`. Editing weights one form
  field at a time would be miserable at 50 tasks. The grid writes sparsely —
  cells left at 1 store no row.
  `POST /admin/api/focuses`, `PATCH /admin/api/focuses/:id`,
  `PUT /admin/api/focuses/:id/weights`
- **New focus flow** — because weights are sparse and missing means 1, a newly
  created focus is immediately valid with zero rows and can be tuned
  afterwards. Warn if a focus has fewer than ~15 tasks at weight ≥1 across
  weeks 2 and 3, since the draw needs headroom.
- **Country editor** — hooks and focus affinities per country, same shape as
  the task list. Generated content needs a spot check, and a wrong hook should
  be one tap to fix or delete.
- **Project type editor** — name, materials, and the ordered week-4 sequence.
  These are sequences, not draws, so ordering is drag or up/down buttons.
  `POST /admin/api/project-types`, `PATCH /admin/api/project-types/:id`
- **Export** — `GET /admin/api/library.json` dumps tasks, focuses, project
  types, weights, hooks, and affinities as JSON. This is the backup, and it's
  how a tuned library gets carried into next school year without a terminal.

### Two rules that hold everywhere here

- **Nothing in the library is ever deleted.** `archived = 1` removes a task or
  focus from future draws while leaving existing `plan_tasks` intact. Hard
  deletes would break months already in progress.
- **Edits propagate live.** `plan_tasks` joins to `task_templates` rather than
  copying text, so fixing a typo fixes it everywhere including active months.
  That is the desired behavior most of the time. The exception is rewriting a
  task into something different mid-month — for that, archive the old one and
  create a new task.

## Exit criteria

- Fixing a typo in a prompt changes it inside an active month
- Archiving a template removes it from the next draw and leaves existing
  `plan_tasks` intact
- The weight grid round-trips: set a cell to 1, the row disappears
- A focus created with zero weight rows draws successfully
- The under-15-tasks warning fires on a fresh focus against the slice 02 seed
- Export downloads, and re-importing that file changes nothing: every row
  round-trips and a second import is a no-op. There is no preview database to
  restore into (§2), so the round-trip is proven in place
- Re-running the seed after editing a seeded row leaves the edit alone

## Do not build

- A delete button, anywhere in the library.
- Anything on this page reachable from the kid-facing app. Nothing in the app
  ever renders a link to `/admin` — not in a nav, not in a footer, not in an
  error page. The threat model is a curious 12-year-old on a shared laptop, so
  the defense is not cryptographic; it is that no link exists.
