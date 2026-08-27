# Open questions

Questions that block build. Each is answered before the code that depends on it
is written — one at a time, and never guessed.

An answered question is written into `../design/DESIGN.md` as settled spec and
moved to the answered list at the bottom of this file.

---

## Open

| # | Question | Blocks | Kind |
|---|---|---|---|
| Q-01 | Does `month_plans` need `redraws_used`? | 01 | schema |
| Q-02 | Does the swap budget survive a redraw? | 01 | schema |
| Q-03 | What is the session cookie signed with? | 00 | secret |
| Q-04 | Are people seeded as placeholders, or created on `/admin`? | 02 | spec conflict |
| Q-05 | How does `/api/catalog` invalidate? | 02 | api |
| Q-06 | Where do the focus preview's sample titles come from? | 04 | api |
| Q-07 | How does setup learn the family's stamped countries? | 04 | api |
| Q-08 | Does a repeated `done` write a second session? | 05 | api |
| Q-09 | How does the wall compare its version value? | 07 | api |
| Q-10 | Is `POST /api/auth` exempt from the wall's write ban? | 07 | auth |
| Q-11 | Does week 4's "present" task require an audience? | 09 | content |

Q-01 through Q-04 are the expensive ones. Q-01, Q-02, and Q-04 change
`001_schema.sql`, which is append-only — a column missed there costs a second
migration and a second deploy cycle through the browser. Q-03 is a secret that
cannot be rotated without logging the family out.

---

## Detail

**Q-01 — Does `month_plans` need `redraws_used`?**
§6 offers "one free redraw, until the first check-off," and the schema has
nowhere to record that it was used. Separately, changing focus also redraws
weeks 2–3 and is unlimited before the first check-off, so the redraw limit may
not be a limit in practice. Either it is enforced and needs a column, or it
isn't and §6 should say so.

**Q-02 — Does the swap budget survive a redraw?**
Swaps used is derived — `COUNT(plan_tasks WHERE swapped_from IS NOT NULL)` — so
regenerating rows resets it to zero. If swaps are only offered after the first
check-off and redraw is only offered before it, the two never overlap and
nothing changes. If they can overlap, the count needs storage.

**Q-03 — What is the session cookie signed with?**
§2 signs the cookie; §3 names `ADMIN_TOKEN` and `FAMILY_TZ` as the secrets.
Nothing names the signing key. Proposed: `SESSION_SECRET`, set in slice 00 with
the others.

**Q-04 — Are people seeded as placeholders, or created on `/admin`?**
§3 says people "are not seeded from SQL." §13 seeds "3 placeholder people,
renamed on `/admin`." These contradict. A person row must exist before anyone
can pick themselves at first run, so placeholders plus an editor is the
workable reading — but §3's sentence needs to say that instead.

**Q-05 — How does `/api/catalog` invalidate?**
It is ~60KB, cached client-side, and the slice 08 country editor edits exactly
what it contains. Without an ETag or a version field, a corrected hook stays
wrong on every device that already loaded it. Cheap to add in slice 02;
impossible to retrofit into caches already in the wild.

**Q-06 — Where do the focus preview's sample titles come from?**
§7's focus highlight shows three task titles from that focus's `weight = 3`
rows. `/api/catalog` carries no templates and no weights. Either the catalog
gains three sample titles per focus, or setup gets
`GET /api/focuses/:id/samples`. The first keeps setup on a single fetch.

**Q-07 — How does setup learn the family's stamped countries?**
"Deal me three" skips already-stamped countries and browse marks them with an
ink dot. Either `/api/me` carries the stamped set, or setup also loads
`/api/passport`.

**Q-08 — Does a repeated `done` write a second session?**
§6 calls `PATCH /api/tasks/:id` idempotent and says done also writes a session.
Two devices sending `done` writes two sessions and inflates days worked — the
one number §10 promises is trustworthy. Proposed: write the session only on an
`open → done` transition.

**Q-09 — How does the wall compare its version value?**
Undo nulls `completed_at`, so `MAX(plan_tasks.completed_at)` can decrease.
Compared with `>` the wall goes permanently stale after any undo. Proposed:
compare for inequality.

**Q-10 — Is `POST /api/auth` exempt from the wall's write ban?**
§8 rejects the wall cookie on every write route. `POST /api/auth` is a write
route and is also how the wall re-authenticates itself. It needs an explicit
exemption.

**Q-11 — Does week 4's "present" task require an audience?**
Carried from §15. Whether the family schedules a presentation night is a
household decision the app can only reflect. It changes the wording of one
week-4 template per project type, so it blocks slice 09 and nothing earlier.

---

## Answered

Nothing yet. Answered questions move here with their answer in one line, and
the spec they settled is written into `../design/DESIGN.md`.
