# Globetrotters — Build Plan

Ten phases against `DESIGN.md`. Each phase ends at a state you can open in a
browser and judge. Phases are ordered by what unblocks the most and by where a
mistake is most expensive to unwind, not by screen order.

The rule underneath the ordering: **the deploy-and-migrate path is built before
anything that needs migrating, and the end-to-end loop runs on a thin library
before the library is written.** Ninety task prompts written ahead of a working
draw are ninety prompts tuned against a guess.

---

## Phase map

| # | Phase | Band | Ends when |
|---|---|---|---|
| 0 | Deploy path | M | Push to `main` reaches production, `/admin/health` proves it |
| 1 | Migration runner | M | Schema applied from a browser, drift visible |
| 2 | Seed v0 + catalog | M | 27 templates, 6 focuses, 195 countries, people named on `/admin` |
| 3 | Auth + shell | M | Passcode → person → empty state, on a phone, in your fonts |
| 4 | Setup → draw → reveal | L | Twenty real tasks on screen, redraw and focus change working |
| 5 | This week | L | Daily loop complete: card, Done, Worked on it, undo, ring |
| 6 | Completion → stamp → passport | M | 20/20 offers the stamp, it lands on `/passport`, page prints |
| 7 | Wall | M | Kitchen tablet ambient view, heartbeat, stamp lands there too |
| 8 | Library editor | L | Tasks, focuses, weights, countries, project types editable |
| 9 | Content fill | L | ~90 templates, `003_country_data.sql`, 75–100 countries adorned |

Phases 0–3 are infrastructure and produce nothing a kid can see. That is
correct and worth stating up front so it doesn't read as slow progress: the
project's hard constraint is browser-only migration (§3), and it is cheapest to
satisfy before there is data to lose.

**Ship point: end of Phase 6.** At that point the app does the whole nine-month
job for one person on one phone. Phases 7–9 are the family experience and the
quality of the work; none of them block September.

---

## Phase 0 — Deploy path

**Goal.** A commit on `main` becomes a running Worker without a terminal.

**Build**
- `wrangler.toml`: Worker + assets, D1 binding, `--preview` D1, R2 bucket bound
  and unused, `[[rules]] type = "Text" globs = ["**/*.sql"]`
- GitHub Action: push to `main` + `workflow_dispatch`, `wrangler deploy`,
  `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` from repo secrets
- Git SHA and build time injected at build, readable at runtime
- Worker secrets set: `FAMILY_PASSCODE`, `ADMIN_TOKEN`, `SESSION_SECRET`,
  `FAMILY_TZ`
- `GET /admin/health` — no auth yet — printing SHA, build time, D1 reachable,
  R2 bound

**Exit criteria**
- Editing a file in the GitHub web editor changes what `/admin/health` prints
- Re-running the Action from the Actions tab by button works
- The `.sql` text rule is proven by importing one throwaway `.sql` file and
  printing its length on the health page

**Why first.** §3's standing failure mode is pressing Apply pending against a
Worker that hasn't deployed. That failure is only diagnosable if the SHA line
exists before the migration runner does.

---

## Phase 1 — Migration runner and `/admin`

**Goal.** Schema in the database, applied from a browser, with the traps in §3
already handled.

**Build**
- `_migrations` table, bootstrapped by the runner itself
- Quote-aware SQL splitter — `split(';')` breaks on semicolons inside string
  literals, and ~90 kid-voice prompts and several country names contain them
- `db.batch()` in chunks of ~50 statements
- `GET /admin` — token form unauthenticated, then a short-lived cookie scoped
  `Path=/admin`
- Migration list with applied / pending / **drifted** state; drift is displayed,
  never auto-fixed
- `POST /admin/api/migrate` — in order, halts on first failure, prints the
  failing statement and the error
- `POST /admin/api/reset-month` — typed confirmation, deletes `sessions`,
  `media`, `stamps`, `plan_tasks`, `month_plans` in that order
- `001_schema.sql` — all tables and indexes from §5
- Prefix split enforced in middleware: `/admin/*` pages, `/admin/api/*` JSON

**Exit criteria**
- Apply pending on an empty database creates every table
- Pressing it again reports nothing pending, does not re-run
- Editing an applied `.sql` file shows it drifted rather than reapplying it
- A deliberately broken migration halts with a readable error and leaves the
  preceding statements committed and recorded
- The splitter is unit-tested against `INSERT INTO x VALUES ('a;b')`

**Risk.** The splitter and the batch limit are the two places this phase fails,
both named in §3, both cheap now and expensive at 900 seed statements.

---

## Phase 2 — Seed v0 and catalog

**Goal.** Enough library to draw a real month, and the family named.

**Build**
- `002_seed.sql`, `INSERT ... ON CONFLICT (slug) DO NOTHING` throughout
  - 6 focuses, 6 project types, ~195 countries with continent and region
  - **27 task templates**, not 20 — see the sizing note below
  - `task_focus_weights` rows only where a focus has an opinion
- `POST /admin/api/seed` — idempotent, reports counts inserted
- `GET /admin/api/people`, `PATCH /admin/api/people/:id` — name, ink, sort order
- `GET /api/catalog` — countries, hooks, affinities, focuses, project types

**Seed v0 sizing.** §14 calls for a 20-template seed. Twenty does not reach the
end of the phase list:

- Week 4 is 5 templates *per project type*. A 20-template seed covers one
  project type, so setup in Phases 4–6 must be restricted to that one type, or
  the week-4 sequence comes back empty.
- Weeks 2 and 3 draw 5 without replacement. A 5-template pool draws all of it,
  which leaves swap with no candidates — `UNIQUE (plan_id, task_template_id)`
  excludes everything already drawn. Swap is untestable until Phase 9.

Seed v0 is therefore: week 1 — 6 (4 `core` + 2 for the fifth slot); week 2 — 8;
week 3 — 8; week 4 — 5, for `trifold-board` only. Twenty-seven templates, three
spare in each drawn week, swap exercisable, one project type live. The other
five project types seed as rows with no week-4 templates and are hidden in
setup until Phase 9 fills them.

**Exit criteria**
- Seed runs twice, second run inserts zero and changes nothing
- Renaming a person on `/admin` sticks and does not require touching SQL
- `/api/catalog` returns and is under ~60KB

---

## Phase 3 — Auth, identity, and the shell

**Goal.** Three steps, once per device, and then never a login screen again.

**Build**
- `POST /api/auth` — passcode → signed cookie, `HttpOnly; Secure;
  SameSite=Lax`, max-age one year, HMAC over `SESSION_SECRET`
- Cookie **re-issued on every authenticated request** so the year slides
- Person selection writes `person_id` into that same signed cookie, server-side
- `GET /api/me` — people list plus active plans
- Frontend shell: buildless vanilla JS + small router, 360px first
- Self-hosted condensed grotesque + humanist sans, tabular numerals
- Design tokens: ink navy ground, chart-paper off-white, three stamp inks from
  `people.color` and nowhere else
- Refetch on launch and on `visibilitychange`, app-wide
- Person switcher in settings, not the header
- Empty state: "Pick a country to start September"

**Exit criteria**
- Passcode → person → empty state on a real phone
- Clearing the cookie returns you to the passcode, and nothing else does
- Both fonts load from the Worker's own assets with no third-party request
- Visible focus rings, `prefers-reduced-motion` respected in the shell

---

## Phase 4 — Setup, draw, reveal

**Goal.** The highest-stakes screen in the app, and the engine behind it.

**Build**
- Draw engine (§4), in the Worker in JS, not SQL: candidates and weights are
  read from D1, weighted selection without replacement runs in code so it is
  unit-testable
  - week 1 — 4 `core` + 1 drawn
  - weeks 2–3 — `fw = COALESCE(weight, 1)`, `fw = 0` excludes,
    `recency = m/(m+1)` with never-drawn at 1.0, `m` counted in months since
    **this person** last drew the template
  - week 4 — the chosen project type's sequence by `position`
  - `archived = 0` filters the draw and nothing else
- `POST /api/plans` → 20 rows in `plan_tasks`; 409 on `UNIQUE (person, month)`
  and the client routes to that plan rather than showing an error
- `start_date` — the later of the month's first Monday and the Monday of the
  week setup happens in. Always a Monday.
- Setup screen: browse by continent, search, country cards carrying one hook and
  the adventure level, ink dots on already-stamped countries
- **Deal me three** — only countries with ≥2 hooks, skipping stamped ones
- Focus highlight shows three sample task titles from that focus's `weight = 3`
  rows; recommended focuses arrive pre-highlighted, never pre-selected
- Project type card shows `materials`
- Reveal: all twenty tasks, then one redraw and change-focus, both until the
  first check-off
- `POST /api/plans/:id/redraw`, `PATCH /api/plans/:id`

**Exit criteria**
- Two people, same country, different focuses, visibly different weeks 2–3
- The same person drawing the same focus two months running gets a materially
  different set — recency is doing work
- A September 20th setup lands in week 1, not week 3
- Setting up a month that already exists opens the plan
- Changing focus before any check-off redraws weeks 2 and 3; changing it after
  is refused
- Changing project type rewrites week 4; refused once any week-4 task is done

**Band L.** The draw is the only real algorithm in the app and the setup screen
is the densest UI. Expect this to be its own session.

---

## Phase 5 — This week

**Goal.** The screen used ~180 times per person.

**Build**
- One card up: the lowest-`position` `open` task in the current week; when the
  week is clear, the first carry-forward item, then the first task of next week
- Five pips, tappable, carrying all three states
- `prompt` in the largest type on the screen; `workbook_page` on every card
- **Done** — completes and writes a session. **Worked on it** — writes a
  session, leaves it open
- Three card states: open / in progress (any `open` task with ≥1 session) / done
- `PATCH /api/tasks/:id` sets an explicit target state, never toggles; the
  session is written on the `open → done` transition only, so a stale second
  device repeating the call does not inflate days-worked
- Undo reopens and **leaves the session row alone**
- One optional line after Done — "What surprised you?", skippable
- Carry-forward strip, never blocking
- Week ring labelled "3 left this week"; "12 of 20" for the month
- Plan screen: all four weeks, swap with remaining budget and
  `swapped_from` named on the replacement card, month's notes accumulating,
  materials from week 1, days worked
- `POST /api/tasks/:id/swap` — same week and focus, excluding this plan's
  templates, week 1 slot 5 and weeks 2–3 only, open tasks only, three a month
- `POST /api/sessions`, `GET /api/stats`

**Exit criteria**
- Check off five tasks across a week on a phone without thinking about it
- Worked on it visibly changes the card and the pip
- Undo returns the card and does not reduce days worked
- Missing three days shifts cards forward and leaves no dead card
- Swap replaces in place and names what it replaced; the fourth swap is refused
- Swap is refused on `core` week-1 tasks, all of week 4, and any done task

---

## Phase 6 — Completion, stamp, passport

**Goal.** The signature moment, and the artifact the year produces.

**Build**
- Twentieth check-off offers it: "That's twenty. Ready to stamp Peru?"
- Accepting routes to `/passport` and the stamp lands there
- `POST /api/plans/:id/complete` — gated on 20/20, writes the stamp with
  `person_id`, `country_id`, `focus_id` denormalized
- Headline is **picked**, from the month's session notes, falling back to the
  twenty completed task titles, and may stay null
- `PATCH /api/stamps/:id` — headline editable from the passport afterwards
- `DELETE /api/plans/:id/complete` — confirm step, not typed
- `GET /api/passport` — all stamps plus the empty grid shape
- Passport: three columns × nine rows, Sep–May, drawn blank from day one; the
  current month's slot shows the country without a stamp, or says unstarted
- Stamp face: person, country, month, focus, slight random rotation and offset,
  in that person's ink
- Watermark against `earned_at` so it lands once per viewer
- Print stylesheet

**Exit criteria**
- An empty passport in September looks like an invitation, not an error
- The twentieth check-off carries you to a stamp landing on the grid
- Reloading `/passport` does not replay the animation
- Un-completing asks first and removes the stamp
- The page prints to one sheet with all three inks legible in grey

**This is the ship point.** Everything through here is one person's nine months,
complete.

---

## Phase 7 — The wall

**Goal.** The family screen, and the reason the stamp is worth anything.

**Build**
- `GET /wall` — its own long-lived cookie type, issued once by entering the
  family passcode at `/wall`
- Middleware rejects the wall cookie on every write route
- `GET /api/wall/version` — `MAX(stamps.earned_at)` and
  `MAX(plan_tasks.completed_at)`; the wall refetches on **inequality**, not on
  increase, because undo can move `completed_at` backwards
- Five-minute heartbeat, full payload only when the version moves
- Refresh control sized for standing, plus "updated Nm ago"
- Screen wake lock, re-acquired on `visibilitychange`
- Three columns — country, focus, week ring — over the passport grid, family
  stamp count as the headline
- Empty state for September 1st
- New stamps play full-screen for ~30s then settle into the grid; watermark in
  `localStorage`, seeded to now on a fresh wall session; simultaneous stamps
  queue and land in turn
- `prefers-reduced-motion` means cross-fade here, not nothing
- Fixed order by `people.sort_order`. No percentages. No month counts. No
  ahead/behind language.

**Exit criteria**
- Rebooting the tablet returns to `/wall` with no passcode and replays nothing
- A stamp earned on a phone appears on the wall within five minutes
- Two stamps inside one heartbeat window land in sequence
- Every write route returns 403 for a wall cookie
- Nothing on the screen lets you compare two people's totals

---

## Phase 8 — Library editor

**Goal.** Tuning without a terminal, after watching two kids use it.

**Build**
- `GET /admin/library`, `GET /admin/api/library`
- Task list: filter by week, tier, focus weight, workbook page; draw counts and
  by whom; inline edit of title, prompt, week, tier, workbook page; new tasks
  default `origin = 'custom'`
- Focus editor: name, blurb, and the weight grid — one cell per week 2–3 task,
  cycling off / 1 / 3, written sparsely via
  `PUT /admin/api/focuses/:id/weights`; cells at 1 store no row
- New focus is valid with zero rows; warn under ~15 tasks at weight ≥1
- Country editor: hooks and affinities per country, one tap to fix or delete
- Project type editor: name, materials, ordered week-4 sequence with up/down
- `GET /admin/api/library.json` — full export
- Archive, never delete

**Exit criteria**
- Fixing a typo in a prompt changes it inside an active month
- Archiving a template removes it from the next draw and leaves existing
  `plan_tasks` intact
- The weight grid round-trips: set a cell to 1, the row disappears
- Export downloads and re-imports into a fresh preview database

---

## Phase 9 — Content fill

**Goal.** The thing that decides whether the app is *good*.

**Build**
- `002_seed.sql` grown to ~90 templates: week 1 — 10, week 2 — 25, week 3 — 25,
  week 4 — 5 per project type across all six
- `003_country_data.sql` — hooks, affinities, research depth for 75–100
  countries chosen for spread across continent, adventure level, and focus
- Every prompt second person, one action, ten minutes
- Every hook a lead, never an assertion
- Affinity never touches the draw

**Exit criteria**
- Deal me three never deals a blank, on ten consecutive shuffles
- Every focus has ≥15 templates at weight ≥1 across weeks 2 and 3
- Nine consecutive months drawn for one person show no week with a repeat
- All six project types selectable with a full week-4 sequence

**Sequencing.** This is append-only migration work and needs no code, so it can
run in parallel with Phases 7–8 by anyone, and it can keep growing all year.

---

## Spec gaps

Eight things `DESIGN.md` leaves undecided that a phase runs into. Each needs a
one-line answer before the phase that hits it, not a design discussion.

1. **Nothing stores redraws used.** §6 offers "one free redraw, until the first
   check-off" and `month_plans` has no column for it. Unlimited focus changes
   already redraw weeks 2–3 for free before the first check-off, so either the
   redraw limit is real and needs `redraws_used INTEGER NOT NULL DEFAULT 0`, or
   it isn't a limit. **Phase 4**, and it is a schema change, so it is cheapest
   in `001_schema.sql`.

2. **Redraw refunds the swap budget.** Swaps used is derived —
   `COUNT(plan_tasks WHERE swapped_from IS NOT NULL)` — so regenerating rows
   resets it to zero. Swap is disallowed before the first check-off anyway if
   swaps only make sense on a settled plan, in which case this is harmless and
   should be stated; otherwise the count needs to survive a redraw. **Phase 4.**

3. **No signing key is specced.** §2's cookie is signed and §3 names
   `ADMIN_TOKEN` and `FAMILY_TZ` as secrets, but nothing names the HMAC key.
   `SESSION_SECRET`. **Phase 0**, because rotating it later logs out the family.

4. **The people seed contradicts itself.** §3 says people "are not seeded from
   SQL"; §13 seeds "3 placeholder people, renamed on `/admin`". Placeholders
   plus an editor is the workable reading — a person row must exist before
   anyone can pick themselves — and §3's sentence should say so. **Phase 2.**

5. **`/api/catalog` has no invalidation.** It is cached client-side and the
   Phase 8 country editor edits exactly what it contains. It needs an ETag or a
   version field, or a fixed hook stays wrong on every device that already
   loaded it. **Phase 2** to add the header, **Phase 8** to make it matter.

6. **Focus samples have no endpoint.** §7's focus highlight shows three task
   titles from `weight = 3` rows, and `/api/catalog` carries no templates or
   weights. Either the catalog gains three sample titles per focus, or setup
   gets `GET /api/focuses/:id/samples`. The first is one extra query at seed
   scale and keeps setup on a single fetch. **Phase 4.**

7. **The wall version can move backwards.** Undo nulls `completed_at`, so
   `MAX(plan_tasks.completed_at)` can decrease. Compared with `>` the wall goes
   permanently stale. Compare for inequality. **Phase 7.**

8. **Idempotent `PATCH /api/tasks/:id` must not re-write the session.** §6 calls
   the endpoint idempotent and says done also writes a session. Two devices
   sending `done` writes two sessions and inflates days worked. Write the
   session only on `open → done`. **Phase 5.**

Two more, smaller: `POST /api/auth` is a write route and must be exempt from the
wall cookie's write ban, or the tablet cannot re-authenticate (**Phase 7**); and
Deal me three needs the family's stamped-country set, which means setup loads
`/api/passport` or `/api/me` carries it (**Phase 4**).

---

## Session boundaries

Phases 0–2 fit one session end to end — they share the same context (wrangler,
D1, SQL) and produce nothing that needs the frontend. Phase 3 is a natural
break: everything after it is UI work.

Phases 4 and 5 each want their own session and will use most of it. Phase 6 can
follow 5 in the same session if 5 goes cleanly.

Phases 7, 8, and 9 share almost nothing with each other and should not be
combined.
