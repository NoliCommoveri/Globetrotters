# Open questions

Questions that block build. Each is answered before the code that depends on it
is written — one at a time, and never guessed.

An answered question is written into `../design/DESIGN.md` as settled spec and
moved to the answered list at the bottom of this file.

---

## Open

Nothing blocking slice 13. Every question raised against a slice has been answered
and written into `../design/DESIGN.md`.

Three are raised against `../design/LIBRARY_v3.md` §7 and are listed there and in the slice
that builds the code depending on them rather than here. Two block slice 15, which builds
the renderers they change: whether *who published this* becomes a stretch line on the six
hardest prompts, and whether `storyboard` gains a CAPTION knob. One blocks slice 16:
whether `emblems` should exist at all.
`civic-process` was the fourth and slice 11 settles it — the tag stays on its four prompts
and People and Power stops weighting it, because all four carry `governance` too and
weighting both pays twice for the same rows.

---

## Answered

| # | Question | Answer |
|---|---|---|
| Q-16 | Do weeks 2 and 3 draw from one pool or two? | **One.** Two per-week draws made a focus's opinion about one week decide nothing about the other, and the library's topic tags are week-lopsided — nine tags with five or more members live entirely in one week. Five of nine focuses had three or fewer genuinely on-theme prompts on one side of the line, which put a whole week of five sheets ignoring the chosen focus at 20–90% of months. One pool of 153, eight drawn, dealt four and four, takes that to 1–19% for seven of the nine and costs the month one task — which puts it back at twenty on twenty weekdays, since `cook-it` becomes one of the ten rather than an eleventh appended to them. `wow-fact` is pinned opposite it in week 2. `DESIGN.md` §4, `LIBRARY_v3.md` §3, `FOCUS-AUDIT.md`. |
| Q-15 | Is the mode-tag anti-monotony rule hard or soft? | **Hard** — never two prompts sharing a mode tag in one month's weeks 2–3. The worry was deadlock: `us-contrast` is 41 of 167 prompts and forbidding a second is a real constraint. Against a 153-template pool it is not one, measured at zero fallbacks in 40,000 draws. The soft version (halving a taken mode's weight) does most of the work and leaves the case it was built for — three sheets that all say *and now write ours next to it* — reachable. `LIBRARY_v3.md` §3. |
| Q-12 | Who prints the month's pages, and from what device? | Anyone, from any device. The printer is reachable from the kids' phones, so a print button is real wherever it sits — which then left where it sits to be decided by the sheets rather than by the device. It is **Print week**, beside every week's heading on Plan, and there is no month-wide button: the sheets break on the week, so printing all four the day the month is drawn puts weeks 2 and 3 on paper a swap away from being wrong, and reprinting the month to fix one week reprints two that nothing changed. `DESIGN.md` §7, §16. |
| Q-11 | Does week 4's "present" task require an audience? | No. All six sequences end "present it to your family" — whoever is home. A scheduled presentation night would be the app asserting a household commitment nine times a year that it cannot see and cannot enforce, and the first month it slips, six templates are telling a kid to do something that is not going to happen. Nothing in the app schedules the event or asks whether it happened. `DESIGN.md` §13, §15. |
| Q-14 | Can a country hook be deleted, when nothing else in the library can? | Yes, and it is the whole of the exception. `archived = 1` exists because `plan_tasks` and `month_plans` reference templates, focuses and project types, and a hard delete would break a month already in progress; nothing references a hook. A generated hook that is wrong, with no correct hook to type over it, has nowhere else to go. There is no delete button anywhere else in the editor. `DESIGN.md` §12, §15. |
| Q-10 | Is `POST /api/auth` exempt from the wall's write ban? | Yes, and it is the whole of the exemption. That route issues the wall cookie, so a tablet whose year has run out has no other way back in; it takes a passcode and hands back a cookie, cannot set a person, and the most a wall cookie gets out of it is another wall cookie. `PATCH /api/me` is not exempt and must not become so. Every other route answers a wall cookie 403 — reads included, since the wall needs exactly two of them. `DESIGN.md` §6, §8, §15. |
| Q-09 | How does the wall compare its version value? | For inequality, never for growth. Both halves move backwards — undo nulls `completed_at`, and removing a stamp deletes the row behind `MAX(earned_at)` — so `>` leaves the wall permanently stale after any undo. The version is also read before the payload and never after it: a write between the two then leaves the stored version older than the screen, costing one wasted fetch instead of a stale wall. `DESIGN.md` §8, §15. |
| Q-13 | Which nine months does the passport grid draw? | The later of today's month and the newest month anyone has a plan for; with no plans anywhere, the month setup would open. Inside the year that is today's month. Over the summer it is the year with work in it: June and July show the year just finished, which is the one that gets printed, and August follows the first September set up early instead of hiding the stamp it earns until the 1st. `DESIGN.md` §7, §15. |
| Q-08 | Does a repeated `done` write a second session? | No. The session is written only on an `open → done` transition. The route stays idempotent and answers 200 whatever state the task was in; writing unconditionally would let two devices or one double-tap count two days, and days worked is the number §10 promises never lies. A genuine second sitting on a finished task goes through `POST /api/sessions`. `DESIGN.md` §6, §10, §15. |
| Q-07 | How does setup learn the family's stamped countries? | `GET /api/passport`, loaded alongside the catalog. `/api/me` is fetched on every launch and every return to the tab; the stamped set is read by one screen 27 times a year, and carrying it on `/api/me` would send it 180 times a month for that. The passport endpoint has to exist for §7's passport screen anyway, so slice 04 built it. `DESIGN.md` §6, §7, §15. |
| Q-06 | Where do the focus preview's sample titles come from? | `GET /api/focuses/:id/samples` — the three titles the focus lifts hardest by `fw`, alternating between the prompts' natural halves, memoized client-side for the life of the page. The catalog stays what it is: it is fetched by every screen and already carries 195 countries. `DESIGN.md` §6, §7, §15. |
| Q-05 | How does `/api/catalog` invalidate? | An ETag over the body, with `Cache-Control: no-cache`. The browser revalidates and takes a 304 when nothing changed. A version field would need a second endpoint and a hand-rolled cache to do what the browser already does. `DESIGN.md` §6, §15. |
| Q-04 | Are people seeded as placeholders, or created on `/admin`? | Placeholders. The seed writes three rows with explicit ids — `people` has no natural key to conflict on — and `/admin` renames them. §3's "not seeded from SQL" sentence was the half that was wrong. `DESIGN.md` §3, §13, §15. |
| Q-03 | What is the session cookie signed with? | `ADMIN_TOKEN`, HMAC-SHA-256. No fourth secret; rotating it logs the family out. `DESIGN.md` §2, §3, §15. |
| Q-01 | Does `month_plans` need `redraws_used`? | No column. Redraw is unlimited until the first check-off and refused after it — the same gate change-focus sits behind, which made a limit of one unenforceable anyway. `DESIGN.md` §6, §7, §15. |
| Q-02 | Does the swap budget survive a redraw? | No. The count stays derived and a redraw resets it, deliberately: the redraw destroys the tasks those swaps bought. Before the first check-off everything is free and resettable; after it the plan is fixed. `DESIGN.md` §4, §15. |
