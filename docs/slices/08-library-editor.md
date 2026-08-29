# Slice 08 — Library editor

**Status:** built
**Band:** L
**Implements:** §12
**Depends on:** 02 (the layout editor also needs 10)

**Goal.** Tuning without a terminal, after watching two kids actually use it.

The library is what determines whether the app is *good*. This slice is what
makes slice 09 something the parent can keep doing all year.

---

## Due-outs

None. Everything this slice needs exists after slice 02.

Best built after slice 05, when there are draw counts worth looking at, but it
does not depend on it.

## Open questions

None. Q-05 was answered and built in slice 02: `/api/catalog` carries an ETag
over its body with `Cache-Control: no-cache`, so a hook corrected here changes
the hash and the next revalidation on a phone takes the new one.

Q-14 was raised and answered in this slice: a country hook can be deleted, and
it is the only thing in the library that can.

## Build

Parent-facing, behind `ADMIN_TOKEN`, not part of the kid experience.

- `GET /admin/library`, `GET /admin/api/library`
- **Task list** — every template, filterable by week, tier, focus weight, and
  workbook page. Shows how many times each has been drawn and by whom, so it's
  obvious which ones are dead weight. Inline edit for title, prompt, week,
  tier, workbook page, and the worksheet layout the task's printed segment uses
  (§16). New tasks default `origin = 'custom'`.
  `POST /admin/api/tasks`, `PATCH /admin/api/tasks/:id`
- **Focus editor** — name, blurb, and the grid of what a focus favours. Slice 11
  rebuilt it on tags: the grid is the topic vocabulary at a 0–3 weight rather
  than a row per prompt. See 11-merged-draw.md.
  `POST /admin/api/focuses`, `PATCH /admin/api/focuses/:id`,
  `PUT /admin/api/focuses/:id/tags`
- **New focus flow** — because weights are sparse and missing means 1, a newly
  created focus is immediately valid with zero rows and can be tuned
  afterwards. Warn if a focus has fewer than ~15 tasks at weight ≥1 across
  weeks 2 and 3, since the draw needs headroom.
- **Worksheet layout editor** — not built here, and not buildable here: the
  `worksheet_layouts` table and the two columns it hangs off `task_templates`
  arrive with slice 10. The editor, the two routes and the layout column on the
  task list all belong to that slice, and its file carries them.
- **Country editor** — hooks and focus affinities per country, same shape as
  the task list. Generated content needs a spot check, and a wrong hook is one
  tap to fix or delete. Hooks are the one deletable thing in the library (Q-14).
  `GET /admin/api/countries/:id`, `POST /admin/api/countries/:id/hooks`,
  `PATCH`/`DELETE /admin/api/hooks/:id`,
  `PUT /admin/api/countries/:id/affinities`
- **Project type editor** — name, materials, and the ordered week-4 sequence.
  These are sequences, not draws, so ordering is drag or up/down buttons.
  `POST /admin/api/project-types`, `PATCH /admin/api/project-types/:id`
- **Export and import** — `GET /admin/api/library.json` dumps tasks, focuses,
  project types, weights, hooks, and affinities as JSON; `POST` to the same path
  reads one back. This is the backup, and it's how a tuned library gets carried
  into next school year without a terminal. Keyed on slug and ISO3 throughout so
  a restore lands in a database whose ids nobody controls. The import upserts
  and never deletes.

### Two rules that hold everywhere here

- **Nothing in the library is ever deleted, except a country hook.** `archived
  = 1` removes a task or focus from future draws while leaving existing
  `plan_tasks` intact. Hard deletes would break months already in progress —
  which is exactly why hooks are the exception: nothing references one (Q-14).
- **Edits propagate live.** `plan_tasks` joins to `task_templates` rather than
  copying text, so fixing a typo fixes it everywhere including active months.
  That is the desired behavior most of the time. The exception is rewriting a
  task into something different mid-month — for that, archive the old one and
  create a new task.

## Exit criteria

- Fixing a typo in a prompt changes it inside an active month
- Archiving a template removes it from the next draw and leaves existing
  `plan_tasks` intact
- The focus grid round-trips: set a cell to its neutral value, the row disappears
- A focus created with no opinions at all draws successfully
- The thin-focus warning fires on a fresh focus
- Export downloads, and re-importing that file changes nothing: every row
  round-trips and a second import is a no-op. There is no preview database to
  restore into (§2), so the round-trip is proven in place
- Re-running the seed after editing a seeded row leaves the edit alone

## Do not build

- A delete button anywhere in the library but on a country hook (Q-14).
- Anything on this page reachable from the kid-facing app. Nothing in the app
  ever renders a link to `/admin` — not in a nav, not in a footer, not in an
  error page. The threat model is a curious 12-year-old on a shared laptop, so
  the defense is not cryptographic; it is that no link exists.
