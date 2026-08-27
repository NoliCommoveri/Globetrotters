# Slice 05 — This week, and Plan

**Status:** not started
**Band:** L
**Implements:** §7 This week, §7 Plan, §10
**Depends on:** 04

**Goal.** The daily loop. This week is used ~180 times per person; everything
else in the app is occasional.

---

## Due-outs

None. Everything this slice needs exists after slice 04.

## Open questions

- **Q-08** — `PATCH /api/tasks/:id` is specced idempotent and also writes a
  session on done. Two devices sending `done` writes two sessions and inflates
  days worked, the one number specced to be trustworthy. Proposed: write the
  session only on an `open → done` transition. Confirm before building the
  handler.

## Build

### This week

- **One card up, not five.** One task, full-bleed. The rest of the week is a
  row of five pips underneath; tap a pip to bring that card up. Order stays
  free — you just stop asking the question every single day.
- **Which card comes up:** the lowest-`position` `open` task in the current
  week. Not "today's task" — `plan_tasks` has no date, and a missed Tuesday
  must not leave a dead card behind. Misses shift forward. When the current
  week is clear, the default card is the first item on the carry-forward strip,
  and failing that the first task of the next week.
- Current week is `floor((today - start_date) / 7) + 1`, clamped to 4 so any
  remainder days fold into Make & Present. `today` comes from `GET /api/me`,
  which slice 04 gave it: it is computed from `FAMILY_TZ` server-side, because a
  phone on a trip is in the wrong timezone. `src/lib/dates.js` holds the
  arithmetic.
- **The prompt is the screen.** `title` is a label; `prompt` is the actual
  instruction and gets the largest type on the phone, readable at arm's length
  by someone standing over a workbook.
- **`workbook_page` on every card.** The physical workbook is the point of the
  whole project.
- **Two buttons.** **Done** completes the task *and* writes a session.
  **Worked on it** writes a session and leaves the task open — the two-sittings
  case the schema was designed for.
- **Three card states: open, in progress, done.** In progress is any `open`
  task with at least one session against it; it needs no new column. Without a
  visible mark, "Worked on it" reads as a dead button — tapped once, nothing
  changes, never tapped again. The pips carry the same three states.
- **One optional line after Done.** "What surprised you?" — skippable, one tap.
  By month's end there are twenty and the stamp headline writes itself.
- **Undo.** One tap to check off is one tap to mis-check. Undo reopens the task
  and **leaves the session row alone**: days-worked is the number specced never
  to go down, and deleting a day's only session is exactly how it would.
- **Carry-forward strip.** Unfinished tasks from earlier weeks as a thin strip
  below the current cards. Never blocking, never a lockout. The finish line is
  the month, not the week.
- **Progress, quietly:** the week ring in your ink, labelled with what's left —
  **"3 left this week"**, not "2" — and "12 of 20" for the month. Same data,
  but one of them is an instruction.

### Plan

The full four-week view, and the only screen that can hold month-scale state,
so it holds all of it.

- All twenty tasks grouped by week
- **Swap** on the cards that allow it, with the remaining budget shown
- **The month's notes**, accumulating down the page. This is what makes "What
  surprised you?" worth answering, and it is the pool the headline is picked
  from — writing one should feel like adding to something rather than paying a
  toll.
- **Materials** for the chosen project type, from week 1 — not tucked inside
  week 4, which is the week it's too late to be useful
- **Days worked**, cumulative, from §10. It replaces the streak and has no
  other home in the app.
- Change country (free, any time); change project type (until week 4), which
  confirms and names what it is replacing and is refused once any week-4 task
  is done

### Endpoints

- `PATCH /api/tasks/:id` — sets an explicit target state, never toggles, so a
  stale second device can't flip a finished task back open
- `POST /api/tasks/:id/swap` — same week and focus, excluding every template
  already in this plan (`UNIQUE (plan_id, task_template_id)` enforces it at the
  database level). Week 1 slot 5 and weeks 2–3 only. Open tasks only. Three a
  month, counted as `COUNT(plan_tasks WHERE swapped_from IS NOT NULL)`.
- `POST /api/sessions` — `{plan_id, plan_task_id?, minutes?, note?}`.
  `local_date` written at insert from `FAMILY_TZ` via `Intl.DateTimeFormat`.
  Never computed from UTC later.
- `GET /api/stats` — the cookie's own person; `?all=1` for all three

### Swap, where it is offered

Week 1's fifth slot, and weeks 2 and 3. Disabled on the four week-1 `core`
tasks, which anchor workbook pages and are meant to repeat — swapping one
leaves a physical page with nothing feeding it. Disabled on all of week 4,
which is an ordered sequence. Refused on a task already `done`.

A swap replaces a card in place, and two prompts from the same week and focus
often read alike — so the new card names what it replaced, out of
`plan_tasks.swapped_from`. Otherwise a swap is indistinguishable from a bug.

### Progress rules

- **No streak, and no safe streak variant.** Nine months containing
  Thanksgiving, winter break, spring break, a flu, and a trip to see
  grandparents. The counter *will* break, probably in November, and it takes
  motivation with it. The app already has two completion mechanics; a streak is
  the only one that can punish.
- **Never show a percentage.** "12 of 20" and "3 left this week" are better
  numbers and they're the language the project already speaks.
- **Keep tasks-done and days-worked separate.** Different numbers, both true.
  Blending them makes both meaningless.

## Exit criteria

- Check off five tasks across a week on a phone without thinking about it
- Worked on it visibly changes the card and the pip
- Undo returns the card and does not reduce days worked
- Sending `done` twice from two devices writes one session
- Missing three days shifts cards forward and leaves no dead card
- A week-1 task checked off in week 3 still checks off — no lockout, ever
- Swap replaces in place and names what it replaced; the fourth swap is refused
- Swap is refused on `core` week-1 tasks, all of week 4, and any done task
- The ring resets Monday and reads "3 left this week"

## Do not build

- The completion offer at 20/20. Slice 06.
- The stamp, or anything on `/passport`. Slice 06.
- Notifications or reminders of any kind. Not in v1, and the empty state plus
  the wall are the specced substitute.
