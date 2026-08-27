# Slice 07 — The wall

**Status:** not started
**Band:** M
**Implements:** §8, §6 (remaining endpoints)
**Depends on:** 06

**Goal.** The family screen, and the reason the stamp is worth anything.

Someone finishes Peru in their bedroom and the stamp lands in the kitchen
thirty seconds later, full-screen, before settling into the grid. That's a
family event delivered with no notification system, using state the app already
has.

---

## Due-outs

- **D-14** The kitchen tablet: which device and which browser. iPad Safari's
  age decides whether the screen wake lock exists at all, and the fallback is
  the tablet's own display-sleep and Guided Access settings, not a workaround
  in the app.

## Open questions

- **Q-09** — the wall version can move backwards. Undo nulls `completed_at`, so
  `MAX(plan_tasks.completed_at)` can decrease; compared with `>` the wall goes
  permanently stale. Proposed: compare for inequality. Confirm before the
  heartbeat is written.
- **Q-10** — `POST /api/auth` is a write route, and the wall cookie is rejected
  on every write route. The tablet then cannot re-authenticate itself. The
  issuing route needs an explicit exemption; confirm that is the whole of it.

## Build

- `GET /wall` — its own long-lived cookie type, issued once by entering the
  family passcode at `/wall`. It should survive a reboot and come back to the
  wall view without anyone typing a passcode.
- **Read-only enforced at the middleware.** "No checkboxes anywhere" is a
  layout decision, not a security property. Requests carrying the wall cookie
  are rejected on every write route — otherwise the tablet in the room guests
  stand in is holding a full-write family cookie for nine months.
- `GET /api/wall` — the payload
- `GET /api/wall/version` — `MAX(stamps.earned_at)` and
  `MAX(plan_tasks.completed_at)`. Two rows read, no payload.
- **A heartbeat, not a poll.** Every five minutes the wall calls the version
  endpoint and fetches the full view only when the value moves. Roughly 290
  requests a day. A 30-second poll of the whole payload is three orders of
  magnitude more D1 reads for a screen that changes about three times a day,
  and the account's row budget is shared with every other database on it.
- **A refresh control anyway**, sized to be hit from standing, plus a quiet
  "updated Nm ago" line. Every other screen refreshes on launch and on
  `visibilitychange`; the wall never launches and never changes visibility,
  which is exactly why it needs both.
- **Screen wake lock**, re-acquired on `visibilitychange` — the lock drops
  every time and does not exist at all on older iPad Safari.
- **Its own type scale.** This is the one place the condensed grotesque gets to
  be huge.
- Three columns — country, focus, week ring — over the passport grid below,
  with the family stamp count as the headline
- **An empty state, because September 1st has one.** Three blank columns is
  what the wall looks like on the first day of the year, and §7 delegates all
  of the app's "nobody has started yet" pressure to this screen. It is an
  invitation and it gets written.

### Stamp replay

- New stamps play full-screen for about half a minute, then settle into the
  grid
- The watermark is **persisted in `localStorage`** and **seeded to the current
  time on a fresh wall session**. Held in memory it is lost on the reboot the
  long-lived cookie exists to survive; seeded to zero, a rebooted tablet
  replays all 27 stamps of the year in sequence.
- If two people cross 20/20 inside one heartbeat window — which is what the
  last day of the month looks like — the stamps **queue and land in turn**
  rather than stacking.
- `prefers-reduced-motion` means a cross-fade here, not nothing. One OS toggle
  on a kitchen tablet should not silently delete the family's only shared
  moment for the year.

### Show state, never rank

Three people doing an identical twenty-task structure, side by side, is
implicitly a leaderboard — and the 11-year-old will sometimes be behind,
broadcast on the kitchen wall, daily.

- Fixed display order by `people.sort_order`. Never sorted by progress.
- No percentages. No ahead/behind language anywhere.
- The **family** number is the headline ("14 stamps this year") with the
  individual rings quiet underneath.
- **The month count is not on the wall.** A 0–5 week ring survives the rule
  because it resets Monday, so being behind is at most a few days old and it
  repairs itself. "9 of 20" beside a sibling's "17 of 20" accumulates for a
  month and cannot be recovered from quickly — it is the leaderboard, and fixed
  sort order does not undo it. The month count stays on the phone, where one
  person sees their own.

This is a rule, not a preference.

## Exit criteria

- Rebooting the tablet returns to `/wall` with no passcode and replays nothing
- A stamp earned on a phone appears on the wall within five minutes
- Two stamps inside one heartbeat window land in sequence, not stacked
- Every write route returns 403 for a wall cookie, and `POST /api/auth` does
  not
- Undoing a completed task does not leave the wall stale
- Nothing on the screen lets you compare two people's totals
- Readable from six feet

## Do not build

- Any control that writes. Not a check-off, not a swap, not a person switcher.
- A notification of any kind. The wall *is* the notification system.
