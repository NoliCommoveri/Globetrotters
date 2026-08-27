# Slice 01 — Migration runner and `/admin`

**Status:** not started
**Band:** M
**Implements:** §3, §5
**Depends on:** 00

**Goal.** Schema in the database, applied from a browser, with §3's two named
traps already handled.

---

## Due-outs

- **D-07** `ADMIN_TOKEN` value chosen and set (part of D-08) — done

Everything else this slice needs was satisfied by slice 00.

## Open questions

- **Q-01** — does `month_plans` need `redraws_used`? §6 offers "one free
  redraw, until the first check-off" and the schema has nowhere to record that
  it was used. This is a schema question, so it is answered here or it becomes
  a second migration later.
- **Q-02** — does the swap budget survive a redraw? Swaps used is derived from
  `COUNT(plan_tasks WHERE swapped_from IS NOT NULL)`, so regenerating rows
  resets it. If the answer is "swaps only apply after the first check-off, so
  it can't happen," nothing changes here. If not, the count needs storage, and
  that is also a schema question.

Both must be answered before `001_schema.sql` is written. Migration files are
append-only; a column missed here costs a second migration and a second deploy
cycle through the browser.

## Build

- `_migrations` table with `id`, `name`, `applied_at`, `checksum`, bootstrapped
  by the runner itself
- **Quote-aware SQL splitter.** `sql.split(';')` breaks on semicolons inside
  string literals, and both country names and ~90 kid-voice prompts contain
  them. Track quote state.
- `db.batch()` in chunks of ~50 statements. The seed migrations are hundreds of
  statements and one enormous batch hits a limit you would be debugging through
  a browser with no terminal.
- `GET /admin` — token form unauthenticated, then a short-lived cookie scoped
  `Path=/admin`
- Migration list showing applied / pending / **drifted**. Drift is displayed,
  never auto-fixed.
- `POST /admin/api/migrate` — pending in order, halting on the first failure
  with the failing statement and the error printed on the page
- The runner refuses to re-run an applied id
- `POST /admin/api/reset-month` — typed confirmation, deleting `sessions`,
  `media`, `stamps`, `plan_tasks`, `month_plans` in that order
- `/admin/health` gains schema version and table row counts
- Middleware prefix split: `/admin/*` serves pages, `/admin/api/*` serves JSON.
  Not `/api/admin/*` — cookie paths match on whole segments, so a cookie scoped
  `Path=/admin` is never sent to `/api/admin/...` and every admin write would
  arrive unauthenticated.
- `001_schema.sql` — every table and index in §5

## Exit criteria

- Apply pending on an empty database creates every table
- Pressing it again reports nothing pending and does not re-run
- Editing an applied `.sql` file shows it drifted rather than reapplying it
- A deliberately broken migration halts with a readable error and leaves the
  preceding statements committed and recorded
- The splitter is unit-tested against `INSERT INTO x VALUES ('a;b')` and
  against a prompt containing an apostrophe
- Reset month deletes a plan and its children without a foreign key error

## Do not build

- The library editor pages. `/admin/library` is slice 08.
- The people editor. It is slice 02, where there are people to edit.
- Any seed data. Slice 02.

## Risk

The splitter and the batch limit are where this slice fails. Both are cheap now
and expensive at 900 seed statements with no terminal to debug from.
