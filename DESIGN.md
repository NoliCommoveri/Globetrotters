# Globetrotters — App Design Doc

Companion app to a family research project: three people (one parent, kids aged
11 and 12) each research one country per month, September through May, ~10
minutes a day, 5 days a week. Physical looseleaf workbooks hold the actual
written work. This app tracks *what has been done*, points the way each day, and
holds the shared family passport.

Everyone has their own device. There is also a tablet on the kitchen wall.

---

## 1. Scope

**V1 builds:**
- Month setup: pick country, focus, and final-project type per person
- Task board: the month's drawn tasks, grouped by week, checked off in any order
- Progress: per-person week ring and cumulative days worked
- Family passport: one stamp per completed country, all three people
- Wall view: read-only ambient screen for the kitchen tablet
- Country library: hooks and focus affinities that make the picker worth using

**Explicitly not in v1** (leave hooks, don't build):
- Photo uploads to R2 — create the binding and the `media` table, no UI
- Any notification/reminder system

**Non-goals forever:** multi-family tenancy, public signup, roles/permissions.

---

## 2. Stack

- Cloudflare Worker serving both the API (`/api/*`) and static assets
- **D1** for all relational data
- **R2** bucket bound and declared in `wrangler.toml`, unused in v1
- Deploy: GitHub Actions on push to `main`, `wrangler deploy`,
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repo secrets
- Separate `--preview` D1 database
- **Migrations run from the browser, never the terminal — see §3**
- Frontend: keep it buildless if possible (vanilla JS + a small router). Three
  users, five screens — a bundler is overhead. If a framework is used, Vite +
  Preact.
- **Self-host the two fonts** in the Worker's assets. Buildless doesn't have to
  mean a third-party dependency on every page load.

**Auth:** one shared family passcode held as a Worker secret, checked once,
stored in a signed cookie (`HttpOnly; Secure; SameSite=Lax`, max-age one year).
After that you pick which of the three people you are — **once, on that device**.
Everyone has their own phone, so this is a setup step, not a recurring choice.
The person switcher lives in settings as an escape hatch for a day-one mis-tap,
not as a header control.

Nine months should pass without anyone seeing a login screen.

---

## 3. Migrations — hard requirement

**The owner cannot use a terminal.** No step in setup, migration, or seeding may
require `wrangler d1 execute`, `wrangler d1 migrations apply`, or any other CLI
command. Everything runs from a browser.

**How it works**

- Migrations live in `/src/migrations/` as `.sql` files, bundled into the Worker
  at build time. Wrangler needs to be told `.sql` is text — it is not by default:

  ```toml
  [[rules]]
  type = "Text"
  globs = ["**/*.sql"]
  ```

  If that fails, generate a `migrations.ts` exporting an ordered array of
  `{ id, name, sql }`. Ids are zero-padded to three digits (`001_`, `002_`) so
  lexicographic sort is apply order.
- A `_migrations` table records `id`, `name`, `applied_at`, `checksum`.
- `GET /admin` serves a plain page listing every migration with its state:
  applied, pending, or **drifted** (checksum no longer matches what was applied —
  show it, never auto-fix it).
- **Apply pending** runs each pending migration in order, statement by statement
  via `db.batch()`, recording the row on success and halting on the first failure
  with the failing statement and error printed on the page.
- Migration files are append-only. To change something already applied, add a new
  file. The runner refuses to re-run an applied id.

**Two implementation traps**

- **The splitter.** `sql.split(';')` breaks on semicolons inside string literals,
  and you will hit them — in country names and in ~90 kid-voice task prompts.
  Write a splitter that tracks quote state.
- **Batch size.** The seed migrations are hundreds of statements. Chunk them into
  batches of ~50 rather than one enormous `db.batch()`, or you will be debugging a
  limit error through a browser with no terminal.

**The admin page also carries**

- **Run seed** — idempotent, safe to press twice, reports counts inserted
- **Health check** — D1 reachable, R2 bound, table row counts, schema version, and
  **the deployed git SHA and build time**. In a browser-only workflow the standing
  failure mode is pressing Apply pending against a Worker that hasn't finished
  deploying. Five lines, saves an hour of confusion.
- **Reset month** *(guarded)* — delete a `month_plan` and its tasks, typed
  confirmation required. This is the one destructive control. D1 enforces foreign
  keys, so it must delete in dependency order: `sessions`, `media`, `stamps`,
  `plan_tasks`, then `month_plans`.

**Access:** a separate `ADMIN_TOKEN` Worker secret, not the family passcode.
`GET /admin` serves the token form unauthenticated; the token is then held in a
short-lived cookie scoped `Path=/admin`. Kids must never stumble into this page.

**Prefix split:** `/admin/*` serves pages. `/api/admin/*` serves JSON. The auth
middleware then splits cleanly by prefix with no content negotiation.

**Deploy is also browser-only:** GitHub Actions on push to `main`, plus
`workflow_dispatch` so it can be re-run from the Actions tab by button. Any new
migration reaches production by editing a file in the GitHub web editor, letting
the Action deploy, confirming the SHA on `/admin`, then pressing Apply pending.

---

## 4. The task model

This is the core idea. Three layers:

**Task pool** — every possible 10-minute task exists as a `task_template`. Each is
tagged with a week theme, a workbook page it feeds, and a tier.

**Focus** — each person independently picks a monthly lens alongside their country.
A focus is a weighting over the pool, not a separate list. Two people can research
the same country with different focuses and get different work.

**Month plan** — at month start the app *draws a snapshot* of 20 tasks into
`plan_tasks`. The plan is then fixed and finite, so "3 left this week" is
answerable and there is a visible finish line. A **swap** button redraws a single
task from the same week and focus.

### Week structure

| Week | Theme | Tasks | Character |
|---|---|---|---|
| 1 | Foundations | 5 | 4 fixed `core` + 1 drawn. Flag, map, location, language. These anchor the workbook pages and are meant to repeat. |
| 2 | Deep Dive | 5 | Focus-weighted draw. History, government, land, ecology, prehistory. |
| 3 | Deep Dive | 5 | Focus-weighted draw. People, culture, food, daily life, wow facts. |
| 4 | Make & Present | 5 | The chosen project type's fixed sequence. No new research. |

**Twenty tasks, twenty weekdays, one a day.** The rhythm is 10 minutes a day, five
days a week — so five tasks a week means the day-to-task mapping is 1:1 and never
drifts. "Twenty" is a number a kid can hold; "about twenty-three" isn't. It also
makes "3 left this week" a pace indicator rather than a bare count: Thursday with
two done tells you everything with no copy at all.

Weeks 1–3 hold all research and aggregation. Week 4 is production only: pick the
artifact, gather materials, two build sessions, rehearse, present.

### Focuses (seed these)

`ancient-world`, `wild-places`, `people-and-power`, `food-and-craft`,
`conflict-and-change`, `land-and-sky`

### Project types (seed these)

`trifold-board`, `model-or-diorama`, `video`, `skit`, `museum-box`,
`illustrated-zine`

### Draw algorithm

```
week 1:
  always include the 4 tier='core' week-1 templates
  draw 1 more from the remaining week-1 pool by the rule below

weeks 2 and 3:
  pool = task_templates where week_theme = week and archived = 0
  for each template t:
    fw = COALESCE(task_focus_weights.weight, 1)   // sparse table; missing = 1
    if fw = 0: exclude
    m  = months since THIS PERSON last drew t     // null if never drawn
    recency = (m is null) ? 1.0 : m / (m + 1)
    weight  = fw * recency
  draw 5 by weighted random selection without replacement

week 4:
  task_templates where project_type_id = chosen type, ordered by position
  — a sequence, not a draw
```

**Why recency and not exclusion.** A hard "never repeat what this person has drawn"
rule sounds like it produces variance, but the arithmetic doesn't work: 5 draws ×
9 months = 45 selections against a pool of 25 per week theme. It exhausts in month
five and every draw after that falls through to an unordered fallback, which
clusters repeats badly.

Recency weighting degrades gracefully instead. Never-drawn scores 1.0, drawn last
month scores 0.5, three months ago 0.75 — so fresh tasks are strongly favored and
old ones rehabilitate over time, with no cliff and no fallback branch.

And repetition is genuinely fine here, which the original framing missed: **no task
is country-specific.** "Find out which animal is on their money and draw it" is a
completely different task in Peru than in Japan. Week 1 already treats repetition as
a feature. Weeks 2–3 should treat it as a mild preference, not a prohibition.

**Swap** redraws from the same week and focus, excluding every template already in
this plan. `UNIQUE (plan_id, task_template_id)` enforces that at the database level.

---

## 5. Schema (D1 / SQLite)

```sql
CREATE TABLE people (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL,          -- passport stamp ink
  sort_order   INTEGER NOT NULL DEFAULT 0,  -- fixed display order, never sorted by progress
  created_at   TEXT NOT NULL
);

CREATE TABLE countries (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  iso3           TEXT NOT NULL UNIQUE,
  continent      TEXT NOT NULL,
  region         TEXT,
  research_depth INTEGER NOT NULL DEFAULT 1
    CHECK (research_depth BETWEEN 1 AND 3)   -- 1 lots to find, 3 you'll have to hunt
);

CREATE TABLE focuses (
  id           INTEGER PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  blurb        TEXT,                   -- one kid-readable line
  archived     INTEGER NOT NULL DEFAULT 0,
  origin       TEXT NOT NULL DEFAULT 'seed'
);

CREATE TABLE project_types (
  id           INTEGER PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  materials    TEXT,                   -- freeform "what you'll need"
  archived     INTEGER NOT NULL DEFAULT 0,
  origin       TEXT NOT NULL DEFAULT 'seed'
);

CREATE TABLE country_hooks (
  id           INTEGER PRIMARY KEY,
  country_id   INTEGER NOT NULL REFERENCES countries(id),
  text         TEXT NOT NULL,          -- a lead, not a fact. See §9.
  position     INTEGER NOT NULL DEFAULT 0,
  origin       TEXT NOT NULL DEFAULT 'seed'
);

CREATE TABLE country_focus_affinity (
  country_id   INTEGER NOT NULL REFERENCES countries(id),
  focus_id     INTEGER NOT NULL REFERENCES focuses(id),
  score        INTEGER NOT NULL CHECK (score IN (2, 3)),  -- 2 good fit, 3 exceptional
  reason       TEXT,                   -- kid-facing, one line
  PRIMARY KEY (country_id, focus_id)
);

CREATE TABLE task_templates (
  id              INTEGER PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE, -- stable key; seed upserts on this
  title           TEXT NOT NULL,       -- "Draw and color the flag"
  prompt          TEXT NOT NULL,       -- the 10-minute instruction, kid voice
  week_theme      INTEGER NOT NULL CHECK (week_theme BETWEEN 1 AND 4),
  workbook_page   TEXT,                -- 'flag', 'map', 'history', 'ecology', ...
  tier            TEXT NOT NULL CHECK (tier IN ('core','focus','wild')),
  project_type_id INTEGER REFERENCES project_types(id),  -- week 4 only
  position        INTEGER,             -- week 4 ordering
  archived        INTEGER NOT NULL DEFAULT 0,
  origin          TEXT NOT NULL DEFAULT 'seed' CHECK (origin IN ('seed','custom')),
  updated_at      TEXT
);

-- Sparse on purpose: a missing row means weight 1. Only opinions are stored.
CREATE TABLE task_focus_weights (
  task_template_id INTEGER NOT NULL REFERENCES task_templates(id),
  focus_id         INTEGER NOT NULL REFERENCES focuses(id),
  weight           REAL NOT NULL,      -- 0 excludes, 3 favors
  PRIMARY KEY (task_template_id, focus_id)
);

CREATE TABLE month_plans (
  id              INTEGER PRIMARY KEY,
  person_id       INTEGER NOT NULL REFERENCES people(id),
  month           TEXT NOT NULL,        -- '2026-09'
  start_date      TEXT NOT NULL,        -- 'YYYY-MM-DD', anchors week_no to the calendar
  country_id      INTEGER NOT NULL REFERENCES countries(id),
  focus_id        INTEGER NOT NULL REFERENCES focuses(id),
  project_type_id INTEGER NOT NULL REFERENCES project_types(id),
  status          TEXT NOT NULL CHECK (status IN ('active','complete')),
  created_at      TEXT NOT NULL,
  completed_at    TEXT,
  UNIQUE (person_id, month)
);

CREATE TABLE plan_tasks (
  id               INTEGER PRIMARY KEY,
  plan_id          INTEGER NOT NULL REFERENCES month_plans(id),
  task_template_id INTEGER NOT NULL REFERENCES task_templates(id),
  week_no          INTEGER NOT NULL CHECK (week_no BETWEEN 1 AND 4),
  position         INTEGER NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('open','done')),
  completed_at     TEXT,
  swapped_from     INTEGER REFERENCES task_templates(id),
  UNIQUE (plan_id, task_template_id)
);

CREATE TABLE sessions (
  id            INTEGER PRIMARY KEY,
  plan_id       INTEGER NOT NULL REFERENCES month_plans(id),
  plan_task_id  INTEGER REFERENCES plan_tasks(id),
  minutes       INTEGER,
  note          TEXT,                   -- one line, optional; feeds stamp headlines
  logged_at     TEXT NOT NULL,
  local_date    TEXT NOT NULL           -- 'YYYY-MM-DD' in FAMILY_TZ, written at insert
);

CREATE TABLE stamps (
  id           INTEGER PRIMARY KEY,
  plan_id      INTEGER NOT NULL UNIQUE REFERENCES month_plans(id),
  person_id    INTEGER NOT NULL REFERENCES people(id),
  country_id   INTEGER NOT NULL REFERENCES countries(id),
  focus_id     INTEGER NOT NULL REFERENCES focuses(id),
  earned_at    TEXT NOT NULL,
  headline     TEXT                     -- one thing they'll remember
);

CREATE TABLE media (                    -- R2 pointers, unused in v1
  id            INTEGER PRIMARY KEY,
  plan_id       INTEGER NOT NULL REFERENCES month_plans(id),
  plan_task_id  INTEGER REFERENCES plan_tasks(id),
  r2_key        TEXT NOT NULL,
  kind          TEXT NOT NULL,
  uploaded_at   TEXT NOT NULL
);

CREATE INDEX idx_plan_tasks_plan_week ON plan_tasks(plan_id, week_no);
CREATE INDEX idx_sessions_plan_date   ON sessions(plan_id, local_date);
CREATE INDEX idx_weights_focus        ON task_focus_weights(focus_id);
CREATE INDEX idx_stamps_person        ON stamps(person_id);
CREATE INDEX idx_hooks_country        ON country_hooks(country_id);
```

**Notes**

- `sessions` is separate from `plan_tasks.status` on purpose: a task can take two
  sittings, and days-worked should count days sat down, not tasks finished.
- Store `local_date` at write time from `FAMILY_TZ` (a Worker secret) using
  `Intl.DateTimeFormat` — Workers support IANA zones. Don't compute from UTC later.
- `start_date` is what makes `week_no` mean anything on the calendar. Current week
  is `floor((today - start_date) / 7) + 1`, clamped to 4 so any remainder days fold
  into Make & Present.
- `stamps` carries `person_id`, `country_id`, and `focus_id` denormalized from the
  plan on purpose: a stamp is a frozen record of what was earned, not a live view.
- Duplicate countries across people are allowed and are not deduped in the UI. Two
  Japans in two different inks is a good artifact.
- **Nothing in the library is ever deleted.** `archived = 1` removes a task or focus
  from future draws while leaving existing `plan_tasks` intact. Hard deletes would
  break months already in progress.
- Draws must filter `archived = 0`. Display must not.

---

## 6. API

```
POST   /api/auth                      passcode -> cookie
GET    /api/me                        people list + active plans
GET    /api/catalog                   countries + hooks + affinities + focuses
                                      + project types. ~60KB, cache client-side.

POST   /api/plans                     {person, month, country, focus, project}
                                      -> draws 20 tasks. 409 on UNIQUE(person, month).
GET    /api/plans/:id                 plan + tasks grouped by week
POST   /api/plans/:id/redraw          one free redraw, until the first check-off
PATCH  /api/plans/:id                 {country?, project_type?} — see below
POST   /api/plans/:id/complete        {headline} — gated on 20/20, writes stamp
DELETE /api/plans/:id/complete        un-complete, removes the stamp

PATCH  /api/tasks/:id                 {status} toggle done/open; done also writes a session
POST   /api/tasks/:id/swap            redraw same week + focus, excluding this plan's tasks
POST   /api/sessions                  {plan_id, plan_task_id?, minutes?, note?}

GET    /api/passport                  all stamps, all people, plus the empty grid shape
GET    /api/stats                     all three people; ?person= narrows to one

GET    /wall                          read-only ambient view (own long-lived cookie)

GET    /admin                         migration + health page (ADMIN_TOKEN)
POST   /api/admin/migrate             apply all pending, in order
POST   /api/admin/seed                idempotent seed run
POST   /api/admin/reset-month         guarded, typed confirmation

GET    /admin/library                 library editor page
GET    /api/admin/library             tasks, focuses, project types, weights
POST   /api/admin/tasks               create custom task
PATCH  /api/admin/tasks/:id           edit, or set archived
POST   /api/admin/focuses             create
PATCH  /api/admin/focuses/:id         edit name, blurb, archived
PUT    /api/admin/focuses/:id/weights bulk weight update (sparse — deletes weight-1 rows)
POST   /api/admin/project-types       create
PATCH  /api/admin/project-types/:id   edit, reorder week-4 sequence
GET    /api/admin/library.json        full export / backup
```

**Why `PATCH /api/plans/:id` is narrow.** Country doesn't affect the draw at all —
tasks are country-agnostic — so it can change any time, freely. Project type isn't
used until week 4, so it can change until then; changing it regenerates the five
week-4 rows if none are done. Focus locks once any task is checked off, because it
shaped the draw.

---

## 7. Screens

Mobile first. The kids will use this on a phone standing at a table. 360px wide.

### This week — the default view

Used ~180 times per person. Everything else in the app is occasional.

- **One card up, not five.** Today's task, full-bleed. The rest of the week is a row
  of five pips underneath; tap a pip to bring that card up. Order stays free — you
  just stop asking the question every single day.
- **The prompt is the screen.** `title` is a label ("Draw and color the flag");
  `prompt` is the actual instruction. The prompt gets the largest type on the phone,
  readable at arm's length by someone standing over a workbook.
- **`workbook_page` on every card.** The physical workbook is the point of the whole
  project. "Flag page" removes the daily where-do-I-write-this friction.
- **Two buttons.** **Done** — completes the task *and* writes a session row.
  **Worked on it** — writes a session, leaves the task open. That second one is the
  two-sittings case the schema was designed for, and it needs a control or the
  design intent never surfaces.
- **One optional line after Done.** "What surprised you?" — skippable, one tap. By
  month's end there are twenty of them and the stamp headline writes itself.
- **Undo.** One tap to check off is one tap to mis-check.
- **Carry-forward strip.** Unfinished tasks from earlier weeks appear as a thin strip
  below the current cards. Never blocking, never a lockout. The finish line is the
  month, not the week.
- **Progress, quietly:** the week ring (0–5) in your ink, and "12 of 20" for the month.

### Month setup

Runs 27 times total across the school year — the least-used screen and by far the
highest-stakes, since it silently determines four weeks of work. It's a ceremony,
not a form.

- **Country: browse by continent, plus search.** 195 in a flat list is unusable for
  an 11-year-old. Each country card carries **one hook line** (§9) — the hook *is*
  the card. Countries the family has already stamped show an ink dot.
- **"Deal me three."** A shuffle that puts three random countries on screen with
  their hooks. Kids choose from three far better than from 195, and this is the best
  interaction on the screen.
- **Tap through** to all hooks, the recommended focuses with their reason lines, and
  the adventure level.
- **Focus: show the consequence, not the description.** "people-and-power" means
  nothing to a kid. Highlighting a focus shows three sample task titles it would pull
  in — one query against the weights table, and it converts an abstract weighting into
  "oh, *that's* what I'd be doing." Recommended focuses arrive pre-highlighted, never
  pre-selected.
- **Project type shows its `materials`.** Picking "model-or-diorama" on September 1st
  is exactly when a parent needs to know they'll want foam board — not on day 22.
- **The draw gets a reveal.** Land on a screen showing all twenty tasks. This is the
  moment you find out what your September looks like. Then offer **one redraw**,
  available until the first check-off.

Nothing triggers setup — there are no notifications in v1. The empty state is the
prompt ("Pick a country to start September"), and the wall view shows who hasn't
started yet. Family pressure instead of push.

### Passport

The shared family wall. 27 stamps for the year, and empty until the last day of
September — so it has to work empty.

- **Draw the whole year from day one.** Three columns, nine rows, Sep–May, as blank
  stamp slots. An unfilled passport is a far stronger invitation than an absent one:
  it shows the shape of the goal in September and makes the full page something you
  can see coming for nine months.
- **The stamp carries the focus.** "Peru · October · Wild Places" records *how* they
  studied it — the whole premise of the focus system, and a free join.
- **Completion is a consequence, not a button.** Gate it on 20 of 20 and let the last
  check-off offer it: "That's twenty. Ready to stamp Peru?" A completion button
  sitting in a corner all month gets tapped in week two and burns the stamp.
- **The headline is chosen, not composed.** At completion, show the month's session
  notes and pick one. A kid asked to summarize a month cold, at the moment they most
  want to be done, writes "it was fun."
- **Printable.** A print stylesheet on `/passport`. In June there are 27 stamps and
  the year is over — this is the page that goes in the front of the binder.

### Plan

Full four-week view for the current month. Swap buttons, notes, materials for the
chosen project type. This is where you look when you want the shape of the month
rather than the shape of today.

---

## 8. The wall tablet

A `/wall` route for the kitchen tablet. Read-only, no person identity, all three
people at once, meant to be read from six feet away.

- **Read-only.** No checkboxes anywhere. A wall tablet gets bumped, and nothing on
  it should be able to complete a task.
- **Its own long-lived cookie.** It should survive a reboot and come back to the wall
  view without anyone typing a passcode.
- **Polls every 30–60s**, holds a screen wake lock, so it's genuinely ambient.
- **Its own type scale.** This is the one place the condensed grotesque gets to be
  huge.
- Shows: three columns — country, focus, week ring, month count — over the passport
  grid below.

**The payoff.** The stamp is the app's signature moment, and on a phone exactly one
person sees it. On the wall, someone finishes Peru in their bedroom and the stamp
lands in the kitchen thirty seconds later, full-screen for about half a minute,
before settling into the grid. That's a family event delivered with no notification
system, using state the app already has. The other two also see a marker on next
open: "Ana finished Peru."

**Guard against replay.** Because the wall polls, a naive implementation re-runs the
stamp animation on every refresh. Compare `earned_at` against a client-side
last-seen watermark and animate only genuinely new stamps. This is the trap that
turns one moment of motion into a twitching wall.

**Show state, never rank.** Three people doing an identical twenty-task structure,
side by side, is implicitly a leaderboard — and the 11-year-old will sometimes be
behind, broadcast on the kitchen wall, daily. So: fixed display order by
`people.sort_order`, never sorted by progress. No percentages. No ahead/behind
language anywhere. The **family** number is the headline ("14 stamps this year")
with the individual rings quiet underneath. This is a rule, not a preference.

---

## 9. Country data

The picker is only as good as what it can tell you about a country. This does not
require a recommendation engine — it requires a column. All of it is generated once,
at build time, into a seed migration: no runtime API, no service dependency, works
offline, and it's hand-quality rather than algorithmic.

**Hooks — 2–3 per country.** The gravitational pull. Not facts, not statistics: one
concrete image each. The salt flat satellites use to calibrate their cameras. A kid
scrolling a continent should hit a sentence that makes them stop.

**Focus affinity — 2–3 per country, with a reason.** `Egypt + ancient-world: you'll
have more to draw than fits on the page.` `Iceland + land-and-sky: the ground is
still being built.` Only recommendations are stored (score 2 or 3); absence means
neutral.

**Research depth — 1 to 3.** Some countries have thin kid-accessible material.
Twenty tasks on a country with almost nothing findable is a month of dead ends and a
demoralized 11-year-old. Framed as adventure level, not difficulty: "lots to find" /
"some digging" / "you'll have to hunt." It's honest, it's useful, and it prevents the
worst month of the year.

**Every hook is phrased as a lead, not a fact.** "Find out what's carved into the
desert at Nazca" — never "The Nazca lines are 2,000 years old and were made by…"
Several hundred generated hooks will contain errors. A hook phrased as a lead turns
an error into a dead-end search; a hook phrased as an assertion turns it into a false
sentence in a workbook. It's also better pedagogy: the app points, the kid finds.

**Keep the boundary clean.** Affinity never touches the draw. Tasks are
country-agnostic; this data only ranks and explains at pick time. If those two
systems couple, you lose the property that a kid can change countries any time.

Ships as `003_country_data.sql`, separate from the core seed so it can be extended
without touching it. Coverage doesn't need to be all 195 — 75–100 countries chosen
for spread across continent, adventure level, and focus affinity is plenty, with the
rest selectable but unadorned.

---

## 10. Progress

**No streak.** A streak is a loss-aversion device built for adults who opted into a
daily habit. This is two kids doing parent-assigned work from September to May — a
span containing Thanksgiving, winter break, spring break, a flu, and a trip to see
grandparents. The counter *will* break, probably in November, and it takes motivation
with it when it goes. The app already has two better motivators, both by design: a
finite twenty-task month with a visible finish line, and a nine-stamp passport. Both
are completion mechanics. A streak is the only one that can punish.

**Two numbers that can't be lost:**

- **This week: a 0–5 ring.** Resets Monday. No history, no memory. Missing Tuesday
  means the ring isn't full — it doesn't destroy anything. And it doubles as a pace
  indicator, since one task maps to one weekday.
- **Days worked: cumulative, only ever goes up.** "47 days" in January feels genuinely
  good and has no downside.

If a streak is wanted anyway, the safe version is **weeks with ≥3 sessions**, not 5.
Requiring a perfect week means it dies the first time someone has a cold.

**Never show a percentage.** "12 of 20" and "3 left this week" are better numbers and
they're the language the project already speaks. Tabular numerals are specced for
exactly this.

**Keep tasks-done and days-worked separate.** They are different numbers and both are
true. Tasks-done drives the month bar; days-worked replaces the streak. Blending them
makes both meaningless.

---

## 11. Design direction

Subject vernacular is the field notebook and the border stamp, not the SaaS dashboard.
Avoid cream + serif + terracotta, and avoid dark-mode-with-one-acid-accent; both read
as generic AI output.

- **Palette:** deep ink navy ground, chart-paper off-white, and three saturated stamp
  inks (one per person, from `people.color`) used only for ownership and completion.
  Nothing else gets to be colorful.
- **Type:** a condensed grotesque for display (headings, country names, the stamp face)
  against a plain humanist sans for body and prompts. Numerals tabular — this app
  counts things constantly. Both self-hosted.
- **Signature:** the passport wall. Completing a country prints a stamp with a slight
  random rotation and offset, in that person's ink, over the country name, month, and
  focus. It's the only place motion is allowed: the stamp lands once, on completion,
  and never replays.
- Everything else stays quiet. Task cards are plain rectangles with generous hit
  targets. Respect `prefers-reduced-motion`, visible focus rings, works at 360px.

Empty states are invitations: an unstarted month says "Pick a country to start
September," not "No data." The empty passport grid is the purest form of this and it
carries the first four weeks of the year.

---

## 12. Library editor

Tasks, focuses, and project types are all editable in the app. Parent-facing, behind
`ADMIN_TOKEN`, not part of the kid experience.

**Task list** — every template, filterable by week, tier, focus weight, and workbook
page. Shows how many times each has been drawn and by whom, so it's obvious which
ones are dead weight. Inline edit for title, prompt, week, tier, and workbook page.
New tasks default to `origin = 'custom'`.

**Focus editor** — name, blurb, and the weight grid: that focus against every week 2–3
task, each cell cycling `off / 1 / 3`. Editing weights one form field at a time would
be miserable at 50 tasks. The grid writes sparsely — cells left at 1 store no row.

**New focus flow** — because weights are sparse and missing means 1, a newly created
focus is immediately valid with zero rows and can be tuned afterward. Warn if a focus
has fewer than ~15 tasks at weight ≥1 across weeks 2 and 3, since the draw needs
headroom.

**Country editor** — hooks and focus affinities per country, same shape as the task
list. Generated content needs a spot check, and a wrong hook should be one tap to fix
or delete.

**Project type editor** — name, materials, and the ordered week-4 sequence. These are
sequences, not draws, so ordering is drag or up/down buttons.

**Edits propagate live.** `plan_tasks` joins to `task_templates` rather than copying
text, so fixing a typo fixes it everywhere including active months. That is the desired
behavior most of the time. The exception is rewriting a task into something different
mid-month — for that, archive the old one and create a new task.

**Seed re-runs never clobber edits.** Seed migrations upsert on `slug` with
`INSERT ... ON CONFLICT (slug) DO NOTHING`. Once a row exists, the seed leaves it alone
forever.

**Export** — `GET /api/admin/library.json` dumps tasks, focuses, project types, weights,
hooks, and affinities as JSON. This is the backup, and it's how a tuned library gets
carried into next school year without a terminal.

---

## 13. Seed data

- `001_schema.sql` — tables and indexes
- `002_seed.sql` — people, focuses, project types, countries, task templates, weights
- `003_country_data.sql` — hooks, focus affinities, research depth

Contents of `002_seed.sql`:

- 3 people (names TBD by user), 6 focuses, 6 project types
- ~195 countries with continent and region
- **~90 task templates**, distributed:
  - Week 1 — 10 templates, 4 marked `core` and always drawn (flag, map,
    location/borders, language & writing system); the rest — basic stats, national
    symbols, currency, neighbors, time zones, size comparison — fill the 5th slot
  - Week 2 — 25 across history, government, law, land, climate, ecology, prehistory
  - Week 3 — 25 across people, religion, daily life for kids and women, food, art,
    music, sport, wow facts, landmarks
  - Week 4 — 5 per project type (30 total), as ordered sequences: choose the artifact,
    gather materials, build, build, rehearse & present
- `task_focus_weights` rows only where a focus has an opinion: 3 for on-theme, 0 to
  exclude. Neutral tasks get no row.

Every `prompt` written in second person to a 5th grader, one clear action, finishable
in ten minutes. "Find out which animal is on their money and draw it" — not "Research
national symbolism."

---

## 14. Build order

The library is what determines whether the app is *good*, and it's also the part
you'll want to tune after watching two kids actually use it — which can't happen until
the loop runs. So don't write 90 prompts before anything is testable.

1. Schema, migration runner, `/admin` health page. Nothing works without browser-run
   migrations, and this is where a mistake is most expensive.
2. A **20-template seed** covering all four weeks. Enough to draw a real month.
3. Month setup → draw → This week → check off → complete → stamp, end to end.
4. `/wall`.
5. Library editor.
6. Fill the library to ~90 templates and add `003_country_data.sql`.

---

## 15. Decisions

Resolved:

- **Timezone.** One `FAMILY_TZ` Worker secret. `local_date` computed at insert via
  `Intl.DateTimeFormat`. Weeks start Monday.
- **What breaks a streak.** Nothing, because there is no streak. See §10.
- **Can a past week's tasks still be checked off?** Yes. No lockout, ever. A lockout
  converts a missed day into a permanently dead card, which is the exact opposite of
  what a passport stamp is for.
- **Does the parent need an override to edit a kid's plan?** No mechanism needed —
  there are no roles, so everyone can already edit everything. The parent's real
  override is the library editor and Reset month, both behind `ADMIN_TOKEN`.
- **Where the month boundary sits.** `month_plans.start_date`, set at setup, defaulting
  to the first weekday of the month. Weeks are 7-day windows from there, week 4
  absorbing the remainder.

Still open:

- Names and ink colors for the three people.
- Whether week 4's "present" task should require an audience — i.e. whether the family
  schedules a presentation night, which is a household decision the app can only
  reflect.
