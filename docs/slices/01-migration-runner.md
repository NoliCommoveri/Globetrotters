# Slice 01 — Migration runner and `/admin`

**Status:** built
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

None. Q-01 and Q-02 are answered and `001_schema.sql` is unaffected by both:
there is no `redraws_used` column and no `swaps_used` column. Redraw is
unlimited until the first check-off and refused after it; a redraw resets the
derived swap count, deliberately, because it destroys the tasks those swaps
bought (`DESIGN.md` §4, §6, §15).

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

All met. `node --test test/*.test.js` proves every one of them against a real
SQLite — `test/d1.js` is a D1-shaped wrapper over `node:sqlite` that matches D1
on the two behaviors the runner depends on: foreign keys enforced, and
`batch()` atomic.

- Apply pending on an empty database creates every table
- Pressing it again reports nothing pending and does not re-run
- Editing an applied `.sql` file shows it drifted rather than reapplying it
- A deliberately broken migration halts with a readable error and leaves the
  preceding statements committed and recorded
- The splitter is unit-tested against `INSERT INTO x VALUES ('a;b')` and
  against a prompt containing an apostrophe
- Reset month deletes a plan and its children without a foreign key error

Two things the slice did not name and the code settles:

- **The admin cookie lasts eight hours**, holds its own expiry, and is signed
  with `ADMIN_TOKEN` — the same key §2's family cookie uses. `DESIGN.md` §3.
- **Reset month's typed confirmation is the plan's month**, not a fixed word.
  `DESIGN.md` §3.

## Do not build

- The library editor pages. `/admin/library` is slice 08.
- The people editor. It is slice 02, where there are people to edit.
- Any seed data. Slice 02.

## Risk

The splitter and the batch limit are where this slice fails. Both are cheap now
and expensive at 900 seed statements with no terminal to debug from.
