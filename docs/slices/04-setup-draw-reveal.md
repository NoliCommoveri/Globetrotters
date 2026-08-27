# Slice 04 — Setup, draw, reveal

**Status:** built
**Band:** L
**Implements:** §4, §7 Month setup
**Depends on:** 03

**Goal.** The highest-stakes screen in the app, and the engine behind it. It
runs 27 times all year and silently determines four weeks of work each time.

---

## Due-outs

- **D-12** — answered: **September through May**, nine months and 27 stamps.
  Hardcoded in `src/lib/dates.js` and read from there by setup, by the empty
  state and by the passport grid.

## Open questions

- **Q-01, Q-02** — answered: no redraw counter, no swap counter. Redraw is
  unlimited until the first check-off; a redraw resets the derived swap count.
  This slice builds that behavior.
- **Q-06** — answered: `GET /api/focuses/:id/samples`, one request per focus
  tapped, memoized client-side. The catalog is fetched by every screen and
  already carries 195 countries; the preview is read on one screen 27 times a
  year.
- **Q-07** — answered: `GET /api/passport`, loaded alongside the catalog. That
  endpoint has to exist for §7's passport screen regardless, so this slice built
  it rather than duplicating the stamped set onto `/api/me`.

## Build

### The draw engine

In the Worker, in JS, not SQL. Candidates and weights are read from D1;
weighted selection without replacement runs in code so it is unit-testable.

```
week 1:
  the 4 tier='core' week-1 templates, always
  1 more drawn from the remaining week-1 pool by the rule below

weeks 2 and 3:
  pool = task_templates where week_theme = week and archived = 0
  fw       = COALESCE(task_focus_weights.weight, 1)   // sparse; missing = 1
  fw = 0   -> excluded
  m        = months since THIS PERSON last drew t     // null if never
  recency  = (m is null) ? 1.0 : m / (m + 1)
  weight   = fw * recency
  draw 5 by weighted random selection without replacement

week 4:
  task_templates where project_type_id = chosen, ordered by position
  a sequence, not a draw
```

Recency, not exclusion: 5 draws × 9 months = 45 selections against a pool of 25
per week theme, so a hard never-repeat rule exhausts in month five and falls
through to an unordered fallback that clusters repeats badly. And repetition is
fine here — no task is country-specific. "Find out which animal is on their
money and draw it" is a different task in Peru than in Japan.

`archived = 0` filters the draw and nothing else. Display must not filter it.

### Plan creation

- `POST /api/plans` → 20 rows in `plan_tasks`
- 409 on `UNIQUE (person, month)`, and the client routes to that plan. The 409
  is a route, not an error screen — it is two devices, or a double-tap on a
  slow connection.
- `start_date` is **the later of the month's first Monday and the Monday of the
  week setup happens in**. Always a Monday. Backdating a September 20th setup to
  the 1st would land the kid in week 3 with all ten Foundations and Deep Dive
  tasks dumped onto a strip built for stragglers, having never seen the flag
  task.
- Plans are keyed on `month`, not dates, so one running into October collides
  with nothing.

### The setup screen

- **Country: browse by continent, plus search.** 195 in a flat list is unusable
  for an 11-year-old.
- Each country card carries **one hook line** — the hook *is* the card — and
  its **adventure level**. Depth belongs on the card, not one level down: it is
  the thing that prevents the worst month of the year, and that only works if
  it's visible where the choice is made.
- Countries the family has already stamped show an ink dot.
- **"Deal me three."** Three countries with their hooks. Kids choose from three
  far better than from 195, and this is the best interaction on the screen — so
  it must never deal a blank. Hook coverage is 75–100 countries, not 195, so
  the shuffle draws only from countries with **at least two hooks** and skips
  stamped ones. Search and browse still reach all 195.
- Tap through to all hooks and the recommended focuses with their reason lines.
- **Focus: show the consequence, not the description.** "people-and-power"
  means nothing to a kid. Highlighting a focus shows three sample task titles
  from its `weight = 3` rows only — weights are sparse and missing means 1, so
  sampling everything a focus "would pull in" returns mostly neutral tasks and
  every focus previews identically. Recommended focuses arrive pre-highlighted,
  never pre-selected.
- **Project type shows its `materials`.** Picking "model-or-diorama" on
  September 1st is exactly when a parent needs to know they'll want foam board.

### The reveal

- Land on a screen showing all twenty tasks. This is the moment you find out
  what your September looks like.
- **Redraw** and **change focus**, both unlimited until the first check-off. Redraw
  alone is the wrong lever: it re-rolls with the same weighting, and when
  twenty tasks look wrong the focus is usually why.
- `POST /api/plans/:id/redraw`
- `PATCH /api/plans/:id` — country free any time (country doesn't touch the
  draw); project type until week 4, regenerating the five week-4 rows, refused
  409 if any is done; focus until the first check-off, redrawing weeks 2 and 3

## What it built

**Server.**

- `src/lib/draw.js` — the engine, pure and injectable-random. Nothing in it
  touches D1, which is what makes weight-0 exclusion and the recency curve
  assertions rather than comments.
- `src/lib/dates.js` — every date in the app, computed in UTC from
  `FAMILY_TZ`. The school year lives here.
- `POST /api/plans`, `GET`/`PATCH /api/plans/:id`, `POST /api/plans/:id/redraw`.
- `GET /api/focuses/:id/samples` (Q-06) and `GET /api/passport` (Q-07). The
  passport endpoint is complete; its screen is slice 06.
- `GET /api/me` gained `today` and `month` — the family's own clock, which the
  client cannot compute.
- `GET /api/catalog` gained `ok: true`. Every other family payload carries it
  and the client's one fetch wrapper reads it as the success flag; without it
  the catalog read as a failure with a 200 on it.

**Client.** `public/js/setup.js`, `public/js/plan.js`, `public/js/deal.js` (the
shuffle rule, pure so "never deals a blank" is a test), `public/js/dom.js`.
Routes `/setup` and `/plan/:id`. The empty state's button works and names the
month from `FAMILY_TZ`.

**Not exercised against real content.** `002_seed.sql` carries no
`country_hooks` and no `country_focus_affinity` rows — both are
`003_country_data.sql`, slice 09. So against the current seed every country card
is a name and an adventure level, no focus arrives recommended, and the shuffle's
eligible pool is empty, which means the control is not offered at all. All three
were built and verified against injected hook data; they go live when slice 09
lands, with no client change.

## Exit criteria

- Two people, same country, different focuses, visibly different weeks 2–3
- The same person drawing the same focus two months running gets a materially
  different set — recency is doing work
- A September 20th setup lands in week 1, not week 3
- `start_date` is a Monday in every case tested, including a month starting on
  a Sunday
- Setting up a month that already has a plan opens that plan
- Changing focus before any check-off redraws weeks 2 and 3; after, it's
  refused
- Changing project type rewrites week 4; refused once any week-4 task is done
- Deal me three never deals a blank — against the slice 02 seed, which has no
  hooks at all, that means the control is not offered
- The draw engine has unit tests: weight 0 excludes, never-drawn scores 1.0,
  drawn last month scores 0.5

## Do not build

- Check-off. Slice 05. The reveal is the end of this slice.
- Swap. Slice 05, on the Plan screen where the budget is visible.
- Affinity influencing the draw. Affinity never touches the draw — tasks are
  country-agnostic, and if those two systems couple you lose the property that
  a kid can change countries any time.

## Band note

The draw is the only real algorithm in the app and setup is the densest UI.
This is a full session on its own.
