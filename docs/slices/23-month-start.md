# Slice 23 — The start week

**Status:** built
**Band:** M
**Implements:** §7 Month setup (the start week), §7 Plan (the fourth lever), §6, §15
**Depends on:** 05

**Goal.** `start_date` stops being computed and becomes chosen, with what it used to
compute as the default. Setup offers the Mondays a month may start on; Plan can move it
afterwards.

**The rule it replaces was right and too rigid.** The later of the month's first Monday
and this week's Monday is the correct default and stays the default — it is what keeps a
late start from dumping ten unseen tasks onto the carry-forward strip. What it could not
do is start a month early. September 2026 begins on a Tuesday, so its first Monday is the
7th and the four weeks run to October 4th; a family away from the 27th needs week 1 to be
the week of August 31st and the month finished before they go. There was no way to say so,
and no way to say it in January either.

---

## Due-outs

None. `month_plans.start_date` already exists and already holds an arbitrary date, so
this is behaviour on a column, not a migration.

## Open questions

All three answered before the code. See `../other/OPEN-QUESTIONS.md` Q-20, Q-21, Q-22.

- **Q-20 — where the control lives.** Both screens. Setup picks it, Plan moves it.
- **Q-21 — which Mondays are offered.** The Monday of the week the month begins, through
  the last Monday of the month, and never a week that has already passed.
- **Q-22 — whether it moves after the first check-off.** Yes, always. It is free like
  the country, not gated like the focus.

## The rule

`start_date` is still always a Monday (§15) and everything downstream of it is unchanged:
weeks are 7-day windows from it, week 4 absorbs the remainder, and `current_week` is
derived rather than stored.

**The window is `[earliest, last]`:**

- `earliest` is the later of the Monday of the week the month begins and the Monday of
  the current week. The first half is what makes an early start possible at all — for
  September 2026 it is August 31st. The second is the no-backdating rule that the old
  default enforced and that survives intact: a month may not start in a week that is
  already over.
- `last` is the last Monday of the month. Past it there is no month left to run.

**The default is the old rule**, unchanged: the later of the month's first Monday and
this week's Monday. It always sits inside the window.

The window is computed on the Worker, from `FAMILY_TZ`, and handed to both screens —
`GET /api/me` carries `start_weeks` for the month setup would open, and the plan payload
carries it for the plan's own month. The client never derives it. A phone on a trip is in
the wrong timezone (§5), and a second copy of a calendar rule is a second calendar rule.

**The window always holds the default**, which is what keeps a month set up after it is
over from having nowhere to start: a September opened in November has exactly one Monday
in it — this week's — and no choice to make. A one-Monday window offers no control on
either screen.

**Nothing is redrawn when it moves.** Tasks carry no dates — the twenty rows are the same
twenty rows, re-anchored — which is why this is free after the first check-off in a way
the focus is not.

## Build

1. **`src/lib/dates.js`** — `lastMondayOf(month)`, `earliestStartFor(month, today)`,
   `startWeeksFor(month, today)` returning the window as an array of Mondays, and
   `isStartWeek(month, today, date)`. `startDateFor` keeps its meaning and its name and
   becomes the default rather than the rule.
2. **`src/api/plans.js`** — `POST /api/plans` takes an optional `start_date` and
   validates it against the window; `PATCH /api/plans/:id` takes `start_date`, ungated by
   `locked`, refused on a stamped month. The plan payload carries `start_weeks`.
3. **`src/api/me.js`** — `start_weeks` for `setupMonthFor(today)`.
4. **`public/js/setup.js`** — the start week on the project stage, above Draw. Offered
   only when the window holds more than one Monday, and labelled with what it costs:
   which week 1 is, and where week 4 ends.
5. **`public/js/plan.js`** — a fourth disclosure, *Move the start week*, in both the
   locked and the unlocked branch and in neither on a stamped month.
6. **`public/js/dom.js`** — `shortDate`, for the chips.
7. **`public/css/app.css`** — the chip row.
8. **Tests** — `test/dates.test.js` for the window, `test/plans.test.js` for the two
   routes and the refusals.

## Exit criteria

- Setup on August 31st 2026 offers August 31 and Sept 7, 14, 21, 28, with September 7
  preselected, and drawing on August 31 puts week 1 in the week of August 31.
- A plan's start week moves from Plan, with tasks checked off, and `current_week` follows.
- A start date outside the window is refused by the route, not only by the UI.
- A stamped month offers neither control and refuses the write.
- A month that is over offers no control: its window is the one Monday it already sits on.
- `node --test test/*.test.js` green.

## Do not build

**Per-week dates.** Tasks stay undated. The week is the unit and moving the anchor moves
all four; a task pinned to a Thursday is a different app.

**A skip-a-week control.** A trip in the middle of a month is a gap in the weeks, not a
different start date, and there is no lockout to rescue anyone from — a missed week's
cards are still checkable (§15).

**A start date that is not a Monday.** The Monday anchor is what keeps `week_no` and the
calendar week ring in agreement (§15).
