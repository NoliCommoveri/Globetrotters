# Open questions

Questions that block build. Each is answered before the code that depends on it
is written — one at a time, and never guessed.

An answered question is written into `../design/DESIGN.md` as settled spec and
moved to the answered list at the bottom of this file.

---

## Open

| # | Question | Blocks | Kind |
|---|---|---|---|
| Q-08 | Does a repeated `done` write a second session? | 05 | api |
| Q-09 | How does the wall compare its version value? | 07 | api |
| Q-10 | Is `POST /api/auth` exempt from the wall's write ban? | 07 | auth |
| Q-11 | Does week 4's "present" task require an audience? | 09 | content |

Q-08 blocks slice 05, Q-09 and Q-10 block slice 07, and Q-11 blocks slice 09.
Nothing is outstanding against slice 06.

---

## Detail

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

| # | Question | Answer |
|---|---|---|
| Q-07 | How does setup learn the family's stamped countries? | `GET /api/passport`, loaded alongside the catalog. `/api/me` is fetched on every launch and every return to the tab; the stamped set is read by one screen 27 times a year, and carrying it on `/api/me` would send it 180 times a month for that. The passport endpoint has to exist for §7's passport screen anyway, so slice 04 built it. `DESIGN.md` §6, §7, §15. |
| Q-06 | Where do the focus preview's sample titles come from? | `GET /api/focuses/:id/samples` — three `weight = 3` titles, alternating between weeks 2 and 3, memoized client-side for the life of the page. The catalog stays what it is: it is fetched by every screen and already carries 195 countries. `DESIGN.md` §6, §7, §15. |
| Q-05 | How does `/api/catalog` invalidate? | An ETag over the body, with `Cache-Control: no-cache`. The browser revalidates and takes a 304 when nothing changed. A version field would need a second endpoint and a hand-rolled cache to do what the browser already does. `DESIGN.md` §6, §15. |
| Q-04 | Are people seeded as placeholders, or created on `/admin`? | Placeholders. The seed writes three rows with explicit ids — `people` has no natural key to conflict on — and `/admin` renames them. §3's "not seeded from SQL" sentence was the half that was wrong. `DESIGN.md` §3, §13, §15. |
| Q-03 | What is the session cookie signed with? | `ADMIN_TOKEN`, HMAC-SHA-256. No fourth secret; rotating it logs the family out. `DESIGN.md` §2, §3, §15. |
| Q-01 | Does `month_plans` need `redraws_used`? | No column. Redraw is unlimited until the first check-off and refused after it — the same gate change-focus sits behind, which made a limit of one unenforceable anyway. `DESIGN.md` §6, §7, §15. |
| Q-02 | Does the swap budget survive a redraw? | No. The count stays derived and a redraw resets it, deliberately: the redraw destroys the tasks those swaps bought. Before the first check-off everything is free and resettable; after it the plan is fixed. `DESIGN.md` §4, §15. |
