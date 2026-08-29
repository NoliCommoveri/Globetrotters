# Globetrotters — App Design Doc

Companion app to a family research project: three people (one parent, kids aged
11 and 12) each research one country per month, September through May, ~10
minutes a day, 5 days a week. Physical looseleaf workbooks hold the actual
written work. This app tracks *what has been done*, points the way each day, and
holds the shared family passport.

Everyone has their own device. There is also a tablet on the kitchen wall.

---

## 1. Scope

**Status:** n/a — scope statement, nothing to build

**V1 builds:**
- Month setup: pick country, focus, and final-project type per person
- Task board: the month's drawn tasks, grouped by week, checked off in any order
- Progress: per-person week ring and cumulative days worked
- Family passport: one stamp per completed country, all three people
- Wall view: read-only ambient screen for the kitchen tablet
- Country library: hooks and focus affinities that make the picker worth using

**Explicitly not in v1** (leave hooks, don't build):
- Photo uploads — create the `media` table, no bucket, no binding, no UI. The
  R2 bucket and its binding arrive with the feature, not ahead of it
- Any notification/reminder system

**Non-goals forever:** multi-family tenancy, public signup, roles/permissions.

---

## 2. Stack

**Status:** partial · everything but the fonts. The Worker, the D1 binding and
the deploy are built (slice 00); the auth path, the person cookie and the
frontend shell are built (slice 03). The two self-hosted faces are outstanding
on D-10 and the shell runs on a system stack until they land.

- Cloudflare Worker serving both the API (`/api/*`) and static assets
- **D1** for all relational data
- **No R2 binding in v1.** The `media` table exists; the bucket does not. A
  binding whose bucket is missing fails the deploy, so it is not declared until
  there is a feature writing to it
- Deploy: **Workers Builds** — the Worker is git-connected to this repo in the
  Cloudflare dashboard and rebuilds on push to `main`. No API token, no account
  id, no repo secrets, no workflow file
- **One D1 database.** No preview database: `preview_database_id` is read only
  by `wrangler dev --remote` and preview deploys, both terminal operations the
  owner cannot perform (§3)
- **Migrations run from the browser, never the terminal — see §3**
- Frontend: buildless. Vanilla JS modules and a small router — three users, five
  screens, a bundler is overhead. If a framework ever proves necessary, Vite +
  Preact.
- **The shell is a static file, not a Worker-rendered page.** `public/index.html`
  is served by the assets binding; the Worker returns that same document for a
  client route with no file behind it, and 404s for a path it does not know.
  `/admin` stays Worker-rendered, and the two have nothing to do with each
  other.
- **Self-host the two fonts** in the Worker's assets. Buildless doesn't have to
  mean a third-party dependency on every page load. Until the licensed files
  arrive the stylesheet points `--font-display` and `--font-body` at the system
  stack; swapping them is an `@font-face` pair and two values, and a re-tune of
  the type scale.

**Auth:** one shared family passcode held as a Worker secret, checked once,
stored in a signed cookie (`HttpOnly; Secure; SameSite=Lax`, max-age one year).
The cookie is **re-issued on every authenticated request**, so the year slides
forward and never expires mid-project.

The signature is HMAC-SHA-256 keyed on `ADMIN_TOKEN` — the same secret §3's
admin page checks. There is no separate signing key. The consequence is a
coupling to hold onto: **changing `ADMIN_TOKEN` invalidates every session
cookie and logs all three people out.** The two rotations are one event, and
`ADMIN_TOKEN` is therefore set once and left alone.

After the passcode you pick which of the three people you are, and **`PATCH
/api/me` writes `person_id` into that same signed cookie**, server-side — not
into `localStorage`, where Safari's seven-day cap on script-writable storage
would quietly forget who someone is over spring break while leaving them logged
in.

Identity is a separate route from the passcode on purpose. `POST /api/auth`
says the device belongs to the family; `PATCH /api/me` says who is holding it.
That split is what lets §8's wall cookie be exempted from the write ban on the
first without ever being able to reach the second.

The gate is a route table, not a check inside each handler: `POST /api/auth` is
the one family route that answers without a cookie, and everything else under
`/api/` is behind it by construction. An unauthenticated request gets a `401`
whether or not the path exists — which routes there are is not something it
gets to map.

**One person, several devices.** Identity is per-device, and nothing server-side
is device-bound: the same person picks themselves on a phone and again on a
laptop, and both are equally real. Two consequences the API has to honor —
`PATCH /api/tasks/:id` sets an explicit target state rather than toggling, so a
stale second device can't flip a finished task back open; and every screen
re-fetches its plan on launch and on `visibilitychange`. The person switcher
lives in settings rather than the header, because it is not a daily control.

The wall tablet gets its **own cookie type**, not this one — see §8.

Nine months should pass without anyone seeing a login screen.

---

## 3. Migrations — hard requirement

**Status:** built · the deploy half (slice 00), the migration runner, `/admin`
and its token gate (slice 01), Run seed and the people editor (slice 02).

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
  with the failing statement and error printed on the page. A `db.batch()` is
  atomic, so a chunk that fails has applied nothing; the runner replays that
  chunk one statement at a time to name the offender, which commits the
  statements before it. A migration that halts is not recorded and stays pending,
  so fixing it means adding a new file — D1 has no transaction spanning batches.
- Migration files are append-only. To change something already applied, add a new
  file. The runner refuses to re-run an applied id.

**Schema and seed are two lists, protected by opposite rules.**
`src/migrations/index.js` exports both, and it stays the only place `.sql` is
imported.

- **`MIGRATIONS`** is schema. Checksummed, append-only, applied once by **Apply
  pending**, and an edit afterwards shows as drift.
- **`SEEDS`** is data. Every insert is `ON CONFLICT ... DO NOTHING`, and **Run
  seed** re-executes the whole list on every press: a row that exists is left
  exactly as it is, a row that is new is inserted.

A seed is not a migration and must not be checksummed. Slice 09 adds ~53 task
templates and all of `003_country_data.sql` to a database that is already
seeded and already carries a month of real work. Under the checksum rule that
edit reads as permanent drift and Apply pending refuses to run it; under the
seed rule it is a file edit in the GitHub web editor and one button press,
which is the only shape the browser-only constraint leaves. The same property
is what makes a title corrected in the library editor survive every future
press.

**Two implementation traps**

- **The splitter.** `sql.split(';')` breaks on semicolons inside string literals,
  and you will hit them — in country names and in ~90 kid-voice task prompts.
  Write a splitter that tracks quote state.
- **Batch size.** The seed migrations are hundreds of statements. Chunk them into
  batches of ~50 rather than one enormous `db.batch()`, or you will be debugging a
  limit error through a browser with no terminal.

**The admin page also carries**

- **Run seed** — idempotent, safe to press twice, reports counts inserted
- **Health check** — D1 reachable, table row counts, schema version, and
  **the deployed git SHA and build time**. In a browser-only workflow the standing
  failure mode is pressing Apply pending against a Worker that hasn't finished
  deploying. Five lines, saves an hour of confusion.
- **People** — the three names and ink colors, editable here. The seed writes
  three placeholder rows, because a person row has to exist before anyone can
  pick themselves at first run; every change after that is made here. Naming
  your own kids must not require editing SQL in a web editor, which is the same
  terminal problem wearing a browser. A name is 1–24 characters — long enough to
  be a name, short enough for the stamp face — and an ink is a six-digit hex,
  stored uppercase, because it is rendered into both CSS and SVG later.
- **Reset month** *(guarded)* — delete a `month_plan` and its tasks. This is the
  one destructive control. The typed confirmation is **the plan's own month**,
  `2026-09`, not a fixed word: a word you type every time stops being a
  confirmation, and this one names the thing being destroyed. D1 enforces foreign
  keys, so it must delete in dependency order: `sessions`, `media`, `stamps`,
  `plan_tasks`, then `month_plans`.

**Access:** a separate `ADMIN_TOKEN` Worker secret, not the family passcode.
`GET /admin` serves the token form unauthenticated, and `POST /admin` is the only
write in the app that may arrive without a cookie, because it is what issues one.
The cookie holds its own expiry and an HMAC-SHA-256 signature over it keyed on
`ADMIN_TOKEN`, scoped `HttpOnly; Secure; SameSite=Lax; Path=/admin`, and lasts
**eight hours** — long enough to deploy, apply pending and come back after
dinner; short enough that a shared laptop left open is not a standing door.
`ADMIN_TOKEN` is also the key the family session cookie is signed with (§2), so
it is never rotated casually.

**Kids must never stumble into this page**, and the threat model is a curious
12-year-old on a shared laptop, not an attacker. So the defense is not
cryptographic: **nothing in the app ever renders a link to `/admin`** — not in a
nav, not in a footer, not in an error page.

**Prefix split:** `/admin/*` serves pages. **`/admin/api/*` serves JSON.** Both
sit under the one path the admin cookie is scoped to, so the auth middleware
splits by prefix with no content negotiation. JSON must not live at
`/api/admin/*`: cookie paths match on whole segments, so a cookie scoped
`Path=/admin` is never sent to `/api/admin/...` and every admin write would
arrive unauthenticated.

**Deploy is also browser-only:** Workers Builds, git-connected to this repo,
building on every push to `main`. A build can be re-run from the deployment's
own **Retry build** button in the dashboard. Any new migration reaches
production by editing a file in the GitHub web editor, letting the build finish,
confirming the SHA on `/admin`, then pressing Apply pending.

Workers Builds is what the three sibling projects on this account already use.
It needs one thing the owner does by hand — create the Worker and point it at
this repo — and nothing else: no API token to scope, no account id to find, no
secrets pasted into GitHub. Wrangler runs inside Cloudflare's builder, which is
not a terminal the owner has to touch.

**Bindings come from `wrangler.toml` at the repo root, never from the
dashboard.** A git-connected Worker takes its script, its static assets and
every binding from that file, and the dashboard's Bindings editor is locked for
one — a binding added there does not persist. Committing the file *is* the
binding step. Worker secrets are the one exception: they are set in the
dashboard, because a secret value must not be committed to git.

---

## 4. The task model

**Status:** partial · slice 04 built the two-pool draw; the merged pool, the deal and the
tag weighting are slice 11

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
| 2 | Deep Dive | 5 | Pinned `wow-fact` + 4 dealt from the weeks 2–3 draw. |
| 3 | Deep Dive | 5 | Pinned `cook-it` + 4 dealt from the same draw. |
| 4 | Make & Present | 5 | The chosen project type's fixed sequence. No new research. |

**Weeks 2 and 3 are one pool and one draw.** Eight are drawn from every weeks 2–3
template at once and then dealt four and four into the two weeks, each week joined by its
pinned task. Two separate per-week draws made a focus's opinion about one week decide
nothing about the other: five of nine focuses had three or fewer genuinely on-theme
prompts on one side of the line, which put a whole week of five sheets that ignored the
chosen focus at 20–90% of months. One pool and a deal takes that to 1–20% for seven of
the nine. `../design/LIBRARY_v3.md` §3 and `../other/FOCUS-AUDIT.md` carry the measurement.

**Twenty tasks, twenty weekdays, one a day.** The rhythm is 10 minutes a day, five
days a week — so five tasks a week means the day-to-task mapping is 1:1 and never
drifts. "Twenty" is a number a kid can hold; "about twenty-three" isn't. It also
makes "3 left this week" a pace indicator rather than a bare count: Thursday with
two done tells you everything with no copy at all.

Weeks 1–3 hold all research and aggregation. Week 4 is production only: pick the
artifact, gather materials, two build sessions, rehearse, present.

### Focuses (seed these)

`ancient-world`, `wild-places`, `people-and-power`, `food-and-craft`,
`conflict-and-change`, `land-and-sky`, `who-lives-here`, `who-gets-what`,
`stories-and-spirits`

A focus is a set of weighted **tags**, not a list of templates (`focus_tags`), so a new
prompt self-onboards: tag it once at authoring time and every focus with a matching
affinity draws it correctly. The nine tag sets are in `../design/LIBRARY_v3.md` §3.

`who-gets-what` and `stories-and-spirits` are new and neither can ship without
`country_focus_affinity` rows — a focus with none is never recommended for any country on
any country card, forever (D-15).

### Project types (seed these)

`trifold-board`, `model-or-diorama`, `video`, `skit`, `museum-box`,
`illustrated-zine`

### Draw algorithm

```
week 1:
  always include the 4 tier='core' week-1 templates
  draw 1 more from the remaining week-1 pool by the rule below

weeks 2 and 3 — one draw, then a deal:
  pool = task_templates where week_theme in (2,3) and tier <> 'fixed'
                          and archived = 0                      // 153
  for each template t:
    fw      = 1 + 2 * SUM(focus_tags.weight) over t's shared topic tags
    m       = months since THIS PERSON last drew t   // null if never drawn
    recency = (m is null or m > 5) ? 1 : 0
    weight  = fw * recency
  draw 6 by weighted random selection without replacement, skipping any
    template whose worksheet form already holds 2 of the ten seats
    (the 2 pinned tasks count) or whose mode tag is already taken this month
  draw 2 wildcards: uniformly from the bottom quarter of the remaining
    eligible pool by fw, same form cap
  deal the 8 into two lists of 4, choosing among the 70 splits by, in order:
    1. no worksheet form appears twice inside one week
    2. the two weeks hold as near the same SUM of fw  -- not a count of them
    3. natural week_theme 2 leans to week 2, 3 to week 3
    4. the two weeks hold as near the same number of thirds
  week 2 = wow-fact + its four; week 3 = cook-it + its four
  nations-before-the-throne and hear-from-a-kid may not land in week 2

week 4:
  task_templates where project_type_id = chosen type, ordered by position
  — a sequence, not a draw
```

**Twenty tasks again.** Five, five, five, five. `cook-it` appended on top of a full week
made twenty-one, which is the one number this section says a kid cannot hold.

**Why a five-month cooldown and not a decay.** A decay was right against a 25-template
week, where a hard exclusion exhausted the pool by month five and fell through to an
unordered fallback. Against 153 it is not: eight draws × five months blocks forty, leaving
113 eligible, and the cliff never arrives. The cooldown is scoped per learner, so a prompt
stays available to a sibling while it rests for one child. If it ever did empty the pool,
drop the single stalest cooldown prompt back in rather than erroring.

Repetition across *months* is genuinely fine, which the original framing got right:
**no task is country-specific.** "Find out which animal is on their money and draw it" is
a completely different task in Peru than in Japan. Week 1 treats that as a feature.

**Repetition of *form* inside one week is not fine, and is the one thing the draw
forbids outright.** Five draws against twenty-seven worksheet forms collide about 40% of
weeks by arithmetic alone — even a perfectly even library floors at 32.5% — so no library
rebalancing fixes it. Capping a form at two of the ten and letting the deal separate the
pair takes it to zero.

**Swap** redraws a single task from the same focus, excluding every template already in
this plan. `UNIQUE (plan_id, task_template_id)` enforces that at the database level. For
weeks 2 and 3 the swap pool is the whole merged 153, not the week the task sits in, and
the replacement respects the same per-form cap against the nine tasks still on the plan.

**Where swap is offered.** Week 1's fifth slot, and weeks 2 and 3. It is disabled
on the four week-1 `core` tasks, which anchor workbook pages and are meant to
repeat — swapping one leaves a physical page with nothing feeding it. It is disabled on
the two `fixed` tasks, `wow-fact` and `cook-it`, for the same reason: they are pinned
because a draw is the wrong instrument for them, and a swap is a draw. It is
disabled on all of week 4, which is an ordered sequence rather than a draw. And it
is refused on a task already marked `done`.

**Three swaps a month.** Enough to fix a genuine mismatch, not enough to reroll a
month into whatever looks easiest. Swaps used is `COUNT(plan_tasks WHERE
swapped_from IS NOT NULL)` — no counter column needed.

**A redraw resets that count to zero, and that is correct.** The whole rule is one
sentence: *before the first check-off everything is free and resettable; after it
the plan is fixed and three swaps is the budget.* A redraw replaces all twenty
rows, so the swaps that were spent went with the tasks they were spent on — there
is nothing left to have a budget against. Nothing needs storing, because there is
nothing to protect: no work has been done yet.

---

## 5. Schema (D1 / SQLite)

**Status:** built · `001_schema.sql` (slice 01) and `004_worksheets.sql`, which
adds `worksheet_layouts` and the two columns it hangs off `task_templates`
(slice 10).

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
  updated_at      TEXT,
  -- §16, added by 004_worksheets.sql. Null layout prints ruled lines.
  worksheet_layout_id INTEGER REFERENCES worksheet_layouts(id),
  worksheet_spec      TEXT   -- JSON, overrides keys of the layout's own spec
);

-- Sparse on purpose: a missing row means weight 1. Only opinions are stored.
CREATE TABLE task_focus_weights (
  task_template_id INTEGER NOT NULL REFERENCES task_templates(id),
  focus_id         INTEGER NOT NULL REFERENCES focuses(id),
  weight           REAL NOT NULL,      -- 0 excludes, 3 favors
  PRIMARY KEY (task_template_id, focus_id)
);

-- §16. About a dozen rows. A layout is a printed form, not a worksheet: many
-- templates bind to the same one.
CREATE TABLE worksheet_layouts (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,          -- 'Drawing box with caption'
  kind          TEXT NOT NULL           -- decides which renderer, and which spec keys
    CHECK (kind IN ('lines','box','split','table','timeline','figures',
                    'checklist','storyboard')),
  height_thirds INTEGER NOT NULL CHECK (height_thirds BETWEEN 1 AND 3),
  spec          TEXT NOT NULL,          -- JSON. Named knobs only, never markup.
  archived      INTEGER NOT NULL DEFAULT 0,
  origin        TEXT NOT NULL DEFAULT 'seed'
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

CREATE TABLE media (                    -- R2 pointers; table only, no bucket in v1
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
  into Make & Present. **It is always a Monday** — see §15 — which is what keeps
  plan weeks and the calendar week ring in agreement, and what makes five tasks map
  to five weekdays.
- `stamps` carries `person_id`, `country_id`, and `focus_id` denormalized from the
  plan on purpose: a stamp is a frozen record of what was earned, not a live view.
- Duplicate countries across people are allowed and are not deduped in the UI. Two
  Japans in two different inks is a good artifact.
- **Nothing in the library is ever deleted.** `archived = 1` removes a task or focus
  from future draws while leaving existing `plan_tasks` intact. Hard deletes would
  break months already in progress.
- Draws must filter `archived = 0`. Display must not.
- `worksheet_layout_id` is nullable and stays that way. A template with no layout
  prints ruled lines under its prompt (§16), so the printed month is complete
  before a single binding is written and improves as they land.

---

## 6. API

**Status:** built · `/api/catalog`, `POST /admin/api/seed` and the two people
routes are built (slice 02); `POST /api/auth` and both `/api/me` routes are
built (slice 03); `POST /api/plans`, `GET`/`PATCH /api/plans/:id`,
`POST /api/plans/:id/redraw`, `GET /api/focuses/:id/samples` and
`GET /api/passport` are built (slice 04); `PATCH /api/tasks/:id`,
`POST /api/tasks/:id/swap`, `POST /api/sessions` and `GET /api/stats` are built
(slice 05); the two completion routes and `PATCH /api/stamps/:id` are built
(slice 06); `GET /wall` and both `/api/wall` routes are built (slice 07); the
library editor is built (slice 08) and its two layout routes with slice 10, as
is `GET /print/:planId`. Every route in this section is built.

```
POST   /api/auth                      passcode -> cookie. The one family route that
                                      answers without one, and the one route a wall
                                      cookie may reach. `{wall: true}` asks for the
                                      wall's cookie instead of the family's — a
                                      downgrade, never the other way (§8, Q-10).
GET    /api/me                        people list + every plan + this device's person
                                      + the family's own today and the month
                                      setup would open
PATCH  /api/me                        {person_id} -> re-issued cookie carrying it
GET    /api/catalog                   countries + hooks + affinities + focuses
                                      + project types. ~67KB (~16KB gzipped),
                                      ETag + 304.
GET    /api/focuses/:id/samples       three weight-3 titles, one week at a time,
                                      for the setup screen's focus preview

POST   /api/plans                     {person, month, country, focus, project}
                                      -> draws 20 tasks. 409 on UNIQUE(person, month),
                                      which the client treats as "go to that plan".
GET    /api/plans/:id                 plan + tasks grouped by week
POST   /api/plans/:id/redraw          redraws all 20. Unlimited until the first
                                      check-off, refused after it (409)
PATCH  /api/plans/:id                 {country?, focus?, project_type?} — see below
POST   /api/plans/:id/complete        {headline?} — gated on 20/20, writes stamp
DELETE /api/plans/:id/complete        un-complete, removes the stamp. Confirmed.

PATCH  /api/tasks/:id                 {status} sets the target state, idempotent —
                                      never a toggle. An open -> done transition
                                      also writes a session; a repeat does not.
POST   /api/tasks/:id/swap            redraw same week + focus, excluding this plan's
                                      tasks. Week 1 slot 5 and weeks 2-3 only, open
                                      tasks only, three per month.
POST   /api/sessions                  {plan_id, plan_task_id?, minutes?, note?}

GET    /api/passport                  all stamps, all people, every plan, plus the
                                      nine-slot grid the year is drawn on
PATCH  /api/stamps/:id                {headline} — the stamp's one line, editable later
GET    /api/stats                     the cookie's own person; ?all=1 for all three

GET    /print/:planId                 the month's pages as a printable document.
                                      ?week=N prints one week, and is what every
                                      button in the app asks for — the sheets
                                      break on the week, so a week is what
                                      reprints. Family cookie only, no person
                                      needed; the wall's is refused. See §16.

GET    /wall                          read-only ambient view (own cookie type).
                                      Its own document, not a shell route: the
                                      shell opens by fetching /api/me, which a
                                      wall cookie is refused.
GET    /api/wall                      the wall payload. No month count, by rule.
GET    /api/wall/version              MAX(stamps.earned_at) and
                                      MAX(plan_tasks.completed_at). Two rows, no
                                      payload — the wall's heartbeat. See §8.

GET    /admin                         migration + health page (ADMIN_TOKEN)
POST   /admin/api/migrate             apply all pending, in order
POST   /admin/api/seed                idempotent seed run
POST   /admin/api/reset-month         guarded, typed confirmation
GET    /admin/api/people              the three people
PATCH  /admin/api/people/:id          name, ink color, sort order

GET    /admin/library                 library editor page
GET    /admin/api/library             tasks, focuses, project types, weights, draw
                                      counts by person, and the country list with
                                      its hook and affinity counts
POST   /admin/api/tasks               create custom task
PATCH  /admin/api/tasks/:id           edit, or set archived
POST   /admin/api/focuses             create
PATCH  /admin/api/focuses/:id         edit name, blurb, archived
PUT    /admin/api/focuses/:id/weights bulk weight update (sparse — deletes weight-1 rows)
POST   /admin/api/project-types       create
PATCH  /admin/api/project-types/:id   edit, reorder week-4 sequence
GET    /admin/api/countries/:id       one country's hooks and affinities
POST   /admin/api/countries/:id/hooks append a hook
PATCH  /admin/api/hooks/:id           edit text or position
DELETE /admin/api/hooks/:id           the one delete in the library (§12)
PUT    /admin/api/countries/:id/affinities  the whole set; off stores no row
POST   /admin/api/layouts             create a worksheet layout (§16)
PATCH  /admin/api/layouts/:id         edit name, kind, height, spec, archived
GET    /admin/api/library.json        full export / backup
POST   /admin/api/library.json        read one back. Upserts on slug and ISO3,
                                      never deletes, and a second import of the
                                      same file is a no-op
```

**How `/api/catalog` invalidates.** An **ETag over the response body**, with
`Cache-Control: no-cache` so the browser keeps the payload but asks before
reusing it. A device that already has the catalog sends `If-None-Match` and gets
a 304 with no body; a hook corrected in the library editor changes the hash and
the next revalidation takes the new one. The cost is one ~200-byte round trip
per load. The alternative — a version field the client compares itself — needs a
second endpoint and a hand-rolled cache to do what the browser already does, and
neither can be retrofitted into caches already in the wild.

Each `project_type` in the payload carries **`week4_templates`**, the count of
its week-4 sequence. Setup hides a project type with zero rather than offering a
month that ends in five blank cards. All six are filled, so the count is now a
guard rather than a filter — a project type created in the editor is hidden until
someone writes its five week-4 rows.

**What `PATCH /api/plans/:id` allows, and when.** Country doesn't affect the draw at
all — tasks are country-agnostic — so it can change any time, freely. Project type
isn't used until week 4, so it can change until then; changing it regenerates the
five week-4 rows, and is refused with a 409 if any of them is already done. Focus
locks once any task is checked off, because it shaped the draw — but until that
first check-off it is editable, and changing it redraws weeks 2 and 3. That is the
lever the reveal screen needs: when twenty tasks look wrong, the cause is usually
the focus, not the roll.

**Redraw sits under the same gate, unlimited until the first check-off.** There is
no redraw counter and no `redraws_used` column. A limit of one was specced and
does not survive contact with change-focus, which rerolls weeks 2–3 as often as
you like under the identical condition — two doors onto the same room, one of them
locked. The first check-off is the only gate, on both.

**What `PATCH /api/tasks/:id` writes, and when.** It sets the state it is given and
answers the same way whatever the task was already in — `done` on a done task is a
200, not a 409, because a stale second device is a normal event and not an error.
The **session is written only on an `open → done` transition**. Idempotence and
"done writes a session" are otherwise in direct conflict: two devices, or one
double-tap on a slow connection, would each add a row and inflate days worked —
the one number §10 promises never lies. A genuine second sitting on a task already
done is logged the way every other session is, through `POST /api/sessions`, which
is the route that exists to write one without touching a task's state.

---

## 7. Screens

**Status:** built · the shell and the first-run path (slice 03), Month setup and
the reveal (slice 04), This week and Plan (slice 05), the passport (slice 06).
Each screen below carries its own marker.

Mobile first. The kids will use this on a phone standing at a table. 360px wide.

**First run, in full:** family passcode → pick which of the three people you are →
land on the empty state, which reads "Pick a country to start September." Three
steps, once per device, and it is the only path every user takes. **Built —
slice 03.**

The app is one static document at `/` that routes client-side. The Worker serves
that same document for every client route it knows, and 404s for any it does
not: a mistyped fetch has to fail as a fetch rather than come back as HTML. The
first two steps are not routes — a device with no passcode, or no person, gets
that screen whatever the URL says.

The person switcher lives in **settings**, reached from the header, and it is
the only control there. Nothing in the app renders a link to `/admin` (§3).

### This week — the default view

**Status:** built · slice 05

Used ~180 times per person. Everything else in the app is occasional.

- **One card up, not five.** One task, full-bleed. The rest of the week is a row
  of five pips underneath; tap a pip to bring that card up. Order stays free — you
  just stop asking the question every single day.
- **Which card comes up.** The **lowest-`position` `open` task in the current week**.
  Not "today's task": `plan_tasks` has no date, and a missed Tuesday must not leave a
  dead card behind. Misses simply shift forward. When the current week is clear, the
  default card is the first item on the carry-forward strip, and failing that the
  first task of the next week.
- **The prompt is the screen.** `title` is a label ("Draw and color the flag");
  `prompt` is the actual instruction. The prompt gets the largest type on the phone,
  readable at arm's length by someone standing over a workbook.
- **`workbook_page` on every card.** The physical workbook is the point of the whole
  project. "Flag page" removes the daily where-do-I-write-this friction.
- **Two buttons.** **Done** — completes the task *and* writes a session row.
  **Worked on it** — writes a session, leaves the task open. That second one is the
  two-sittings case the schema was designed for, and it needs a control or the
  design intent never surfaces.
- **Three card states, not two: open, in progress, done.** "Worked on it" has to
  leave a visible mark or it reads as a dead button — tapped once, nothing changes,
  never tapped again, and the two-sittings design never surfaces after all. In
  progress is any `open` task with at least one session against it; it needs no new
  column. The pips carry the same three states.
- **One optional line after Done.** "What surprised you?" — skippable, one tap. By
  month's end there are twenty of them and the stamp headline writes itself. They
  accumulate visibly on **Plan**, so writing one feels like adding to something
  rather than paying a toll.
- **Undo.** One tap to check off is one tap to mis-check. Undo reopens the task and
  **leaves the session row alone** — days-worked is the number specced never to go
  down (§10), and deleting a day's only session is exactly how it would.
- **Carry-forward strip.** Unfinished tasks from earlier weeks appear as a thin strip
  below the current cards. Never blocking, never a lockout. The finish line is the
  month, not the week.
- **Progress, quietly:** the week ring in your ink, labelled with what's left rather
  than what's banked — **"3 left this week"**, not "2" — and "12 of 20" for the month.
  Same data, but one of them is an instruction.

### Month setup

**Status:** built · slice 04

Runs 27 times total across the school year — the least-used screen and by far the
highest-stakes, since it silently determines four weeks of work. It's a ceremony,
not a form.

- **Country: browse by continent, plus search.** 195 in a flat list is unusable for
  an 11-year-old. Each country card carries **one hook line** (§9) — the hook *is*
  the card — and its **adventure level**, which belongs on the card rather than one
  level down. §9 calls research depth the thing that prevents the worst month of the
  year; that only works if it's visible where the choice is actually made. Countries
  the family has already stamped show a dot in the ink of whoever stamped them —
  setup reads the set from **`GET /api/passport`** alongside the catalog (Q-07). A
  dot, not a lockout: browse still reaches a stamped country and setup still
  accepts it. What it prevents is picking one by accident.
- **"Deal me three."** A shuffle that puts three countries on screen with their hooks.
  Kids choose from three far better than from 195, and this is the best interaction on
  the screen — so it must never deal a blank. Hook coverage is 75–100 countries, not
  195, so the shuffle draws only from countries with **at least two hooks**, and skips
  ones the family has already stamped. When that pool cannot fill three cards the
  control is not offered at all, which is its state until `003_country_data.sql`
  is written. Search and browse still reach all 195.
- **Tap through** to all hooks and the recommended focuses with their reason lines.
- **Focus: show the consequence, not the description.** "people-and-power" means
  nothing to a kid. Highlighting a focus shows three sample task titles it would pull
  in — drawn from its **`weight = 3` rows only**, and alternating between weeks 2 and
  3 so the preview shows the whole month rather than half of it. Weights are sparse
  and a missing row means 1, so sampling everything a focus "would pull in" returns
  mostly neutral tasks and every focus previews identically. The titles come from
  **`GET /api/focuses/:id/samples`**, one request per focus tapped, memoized for the
  life of the page (Q-06). Recommended focuses arrive pre-highlighted — the preview
  open — but **never pre-selected**: choosing is always a tap.
- **Project type shows its `materials`.** Picking "model-or-diorama" on September 1st
  is exactly when a parent needs to know they'll want foam board — not on day 22. It
  stays visible on **Plan** all month, because nobody reopens setup.
- **The draw gets a reveal.** Land on a screen showing all twenty tasks. This is the
  moment you find out what your September looks like. Then offer **redraw** and
  **change focus**, both unlimited until the first check-off. Redraw alone is the
  wrong lever: it re-rolls with the same weighting, and when twenty tasks look wrong
  the focus is usually why.
- **Starting late is normal, and must not skip weeks.** `start_date` is the later of
  the month's first Monday and today's week (§15). Backdating a September 20th setup
  to the 1st would land the kid in week 3 with all ten Foundations and Deep Dive tasks
  dumped onto a strip built for stragglers, having never seen the flag task. Plans are
  keyed on `month`, not dates, so a plan running into October collides with nothing.
- **Setting up a month that already has a plan opens that plan.** Two devices, or a
  double-tap on a slow connection. The `409` carries the existing plan's id, so it is
  a route rather than an error screen.
- **The year is September through May** (D-12), and setup refuses a month outside it.
  Inside the year the month is simply this one; over the summer the empty state points
  at the September ahead. Which month it is comes from `FAMILY_TZ` by way of
  `GET /api/me`, not from the device — a phone on a trip is in the wrong timezone.
- **A plan is readable by the family and rerollable only by its owner.** There are no
  roles in this app and the passport is shared, so seeing someone's month is the
  point; rerolling it is not. `POST /api/plans/:id/redraw` and `PATCH /api/plans/:id`
  answer `403` to anyone but the plan's person.

Nothing triggers setup — there are no notifications in v1. The empty state is the
prompt ("Pick a country to start September"), and the wall view shows who hasn't
started yet. Family pressure instead of push.

### Passport

**Status:** built · slice 06

The shared family wall. 27 stamps for the year, and empty until the last day of
September — so it has to work empty.

- **Draw the whole year from day one.** Three columns, nine rows, Sep–May, as blank
  stamp slots. An unfilled passport is a far stronger invitation than an absent one:
  it shows the shape of the goal in September and makes the full page something you
  can see coming for nine months.
- **Which nine months.** The later of today's month and the newest month anyone has
  a plan for; with no plans anywhere, the month setup would open. Inside the school
  year that is simply today's. Over the summer it is the year with work in it: June
  and July show the year just finished, which is the year you print, and August
  follows the first September set up early rather than making the stamp it earns
  invisible until the 1st.
- **The current month's slot is not blank.** In October, September's slot is stamped
  and October's would otherwise look identical to May's — throwing away the one piece
  of live state the family screen could carry. An in-progress slot shows the country
  name without a stamp, and an unstarted one says so. That puts "who hasn't started
  yet" on every phone instead of only on the wall.
- **The stamp carries the person and the focus.** "Ana · Peru · October · Wild
  Places". The focus records *how* they studied it, which is the whole premise of the
  focus system and a free join. The name is there because ink is not a reliable
  ownership signal: column position carries it on the grid, but the wall's full-screen
  stamp has no column, and a home printer renders all three inks as the same grey.
- **Completion is a consequence, not a button.** Gate it on 20 of 20 and let the last
  check-off offer it: "That's twenty. Ready to stamp Peru?" A completion button
  sitting in a corner all month gets tapped in week two and burns the stamp.
- **Accepting routes to `/passport`, and the stamp lands there.** The offer appears on
  a task card; the stamp lives on the passport. Unstated, the app's signature moment
  either plays on the wrong canvas or is missed entirely by a kid who taps through
  later to an already-stamped grid.
- **The headline is chosen, not composed.** At completion, show the month's session
  notes and pick one. A kid asked to summarize a month cold, at the moment they most
  want to be done, writes "it was fun." If no notes were written all month — the
  prompt is skippable twenty times — fall back to picking from the twenty completed
  task titles. `headline` may also stay null, and it is **editable afterwards from the
  passport**: it is the permanent text on the year's artifact, and it is chosen at the
  single moment of least care, the tap that ends the month.
- **Un-completing is confirmed.** `DELETE /api/plans/:id/complete` destroys an earned
  stamp, there are no roles, and it is the only destructive control outside `/admin`.
  Typed confirmation is overkill; a confirm step is not.
- **Printable.** A print stylesheet on `/passport`. In June there are 27 stamps and
  the year is over — this is the page that goes in the front of the binder. **US
  Letter, one sheet** (D-13): every row is the same fixed height and the whole year
  scales to fit rather than breaking across pages. All three inks are legible in
  grey, and the stamp carries the person's name so the ink never has to be read.

### Plan

**Status:** built · slice 05

Full four-week view for the current month — all twenty tasks grouped by week. This
is where you look when you want the shape of the month rather than the shape of
today, and it is the only screen that can hold month-scale state, so it holds all
of it:

- **Swap**, on the cards that allow it (§4): week 1's fifth slot and weeks 2–3, open
  tasks only, three a month, with the remaining budget shown. A swap replaces a card
  in place, and two prompts from the same week and focus often read alike — so the
  new card names what it replaced, out of `plan_tasks.swapped_from`. Otherwise a swap
  is indistinguishable from a bug.
- **The month's notes**, accumulating down the page. This is what makes "What
  surprised you?" worth answering, and it is the pool the stamp headline is picked
  from.
- **Materials** for the chosen project type, from week 1 — not tucked inside week 4,
  which is the week it's too late to be useful.
- **Days worked**, the cumulative number from §10. It replaces the streak and it has
  no other home in the app.
- **Plan-level edits**: change country (free, any time), change project type (until
  week 4). Changing project type rewrites the five week-4 cards, so it confirms and
  names what it is replacing, and it is refused once any of them is done.
- **Swap is owner-only; checking off is not.** A swap is a reroll of one slot
  against a budget, so a sibling on a shared phone can spend somebody else's month
  the same way a redraw would — `POST /api/tasks/:id/swap` answers `403` alongside
  `redraw` and `PATCH /api/plans/:id`. `PATCH /api/tasks/:id` and
  `POST /api/sessions` stay open to the family: there are no roles here, and a
  parent checking off beside a kid is the normal case rather than an override.

---

## 8. The wall tablet

**Status:** built · slice 07

A `/wall` route for the kitchen tablet. Read-only, no person identity, all three
people at once, meant to be read from six feet away.

- **Read-only, enforced at the middleware.** "No checkboxes anywhere" is a layout
  decision, not a security property. The wall's cookie is **its own type**, and a
  request carrying it reaches `GET /api/wall`, `GET /api/wall/version` and nothing
  else — every other route in the app answers it 403, reads included. Otherwise the
  tablet in the room guests stand in is holding a full-write family cookie for nine
  months.

  **`POST /api/auth` is the one exemption, and it is the whole of it (Q-10).** That
  route is what issues the wall cookie, so a tablet whose year has run out has no
  other way back in. It is safe to leave open to the wall for the same reason it is
  safe to leave open to everyone: it takes the passcode and hands back a cookie, it
  cannot set a person, and the most a wall cookie can get out of it is another wall
  cookie. `PATCH /api/me` is not exempt and must not become so — an identity on the
  kitchen tablet is the thing the ban exists to prevent.
- **Its own long-lived cookie.** It should survive a reboot and come back to the wall
  view without anyone typing a passcode. Issued once, by entering the family passcode
  at `/wall`.
- **A heartbeat, not a poll.** Every five minutes the wall calls
  `GET /api/wall/version` — `MAX(stamps.earned_at)`, `MAX(plan_tasks.completed_at)`,
  two rows read, no payload — and fetches the full view only when that value moves.
  **Compared for inequality, never for growth (Q-09).** Both halves can go
  backwards: undo nulls `completed_at`, and removing a stamp deletes the row behind
  the other maximum. Compared with `>` the wall goes permanently stale after any
  undo, until the next stamp. The version is also read *before* the payload and
  never after it, so a write landing between the two leaves the stored version
  older than what is on screen — one wasted fetch on the next beat, rather than a
  stale wall.
  Roughly 290 requests a day. A 30-second poll of the whole payload is three orders
  of magnitude more D1 reads for a screen that changes about three times a day, and
  the account's row budget is shared with every other database on it.
- **A refresh control anyway**, sized to be hit from standing, plus a quiet "updated
  Nm ago" line. Every other screen refreshes on launch and on `visibilitychange`; the
  wall never launches and never changes visibility, which is exactly why it needs
  both the heartbeat and the manual control.
- **Holds a screen wake lock**, re-acquiring it on `visibilitychange` — the lock drops
  every time and does not exist at all on older iPad Safari, a fair description of a
  wall tablet. The fallback is the tablet's own display-sleep and Guided Access
  settings, not a workaround in the app.
- **Its own type scale.** This is the one place the condensed grotesque gets to be
  huge.
- Shows: three columns — **country, focus, week ring** — over the passport grid
  below, with the family stamp count as the headline.
- **An empty state, because September 1st has one.** Three blank columns is what the
  wall looks like on the first day of the year, and §7 delegates all of the app's
  "nobody has started yet" pressure to this screen. It is an invitation and it gets
  written.

**The payoff.** The stamp is the app's signature moment, and on a phone exactly one
person sees it. On the wall, someone finishes Peru in their bedroom and the stamp
lands in the kitchen thirty seconds later, full-screen for about half a minute,
before settling into the grid. That's a family event delivered with no notification
system, using state the app already has. The other two also see a marker on next
open: "Ana finished Peru."

**Guard against replay.** Because the wall re-fetches, a naive implementation re-runs
the stamp animation every time. Compare `earned_at` against a last-seen watermark and
animate only genuinely new stamps. The watermark is **persisted in `localStorage` and
seeded to the current time on a fresh wall session** — held in memory it would be lost
on the reboot the long-lived cookie exists to survive, and seeded to zero a rebooted
tablet replays all 27 stamps of the year in sequence. If two people cross 20/20 inside
one heartbeat window, which is what the last day of the month looks like, the stamps
**queue and land in turn** rather than stacking.

`prefers-reduced-motion` is respected here as everywhere (§11), but on the wall it
means a cross-fade, not nothing: one OS toggle on a kitchen tablet should not silently
delete the family's only shared moment for the year.

**Show state, never rank.** Three people doing an identical twenty-task structure,
side by side, is implicitly a leaderboard — and the 11-year-old will sometimes be
behind, broadcast on the kitchen wall, daily. So: fixed display order by
`people.sort_order`, never sorted by progress. No percentages. No ahead/behind
language anywhere. The **family** number is the headline ("14 stamps this year")
with the individual rings quiet underneath. This is a rule, not a preference.

**Which is why the month count is not on the wall — and not in its payload.** A 0–5 week ring survives the
rule by §10's own logic: it resets Monday, so being behind is at most a few days old
and it repairs itself. "9 of 20" beside a sibling's "17 of 20" accumulates for a
month and cannot be recovered from quickly — it is the leaderboard, and fixed sort
order does not undo it. The month count stays on the phone, where one person sees
their own. `GET /api/wall` therefore does not carry one: a number that is not in the
response cannot be rendered by a later change to the client that forgot why.

---

## 9. Country data

**Status:** built · slice 09

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
without touching it. Coverage is not all 195 and does not need to be: **100
countries** carry 222 hooks and 200 affinities, chosen for spread across
continent, adventure level and focus affinity — every continent, all three
adventure levels, and every focus recommended for at least fifteen countries.
The other 95 stay selectable and unadorned.

**Re-running the file cannot duplicate a hook or resurrect a deleted one.**
`country_hooks` has no unique key to conflict on — a hook is a line of prose, not
a keyed row — so the insert is guarded on the country: a country that already
holds any hook is skipped whole. That is what makes the library editor's one
delete (§12) survive every future press of Run seed, and it costs the other half
of the same rule — a hook *added* to the file for a country already seeded will
not land, and belongs in the editor instead. Affinities have a real key,
`(country_id, focus_id)`, so they take the ordinary `ON CONFLICT DO NOTHING` and
a reason reworded in the editor survives.

`research_depth` is the one library column a seed file is allowed to revise,
because it is the one nothing else writes: the editor does not expose it, so the
`UPDATE` cannot overwrite anyone's work and the second press changes nothing.

---

## 10. Progress

**Status:** built · slice 05

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
  indicator, since one task maps to one weekday. That mapping is only true because
  `start_date` is always a Monday (§15): anchored to the first weekday of the month
  instead, plan weeks and calendar weeks would disagree in four years out of five and
  the ring would reset mid-week. Label it with what's left — "3 left this week" — not
  with what's banked.
- **Days worked: cumulative, only ever goes up.** "47 days" in January feels genuinely
  good and has no downside. It only goes up if undo leaves session rows alone (§7):
  deleting the session behind a mis-tap takes the whole day with it when it was that
  day's only one. Over-counting by one is harmless here; decrementing breaks the one
  promise this number makes. It lives on **Plan**.

There is no safe streak variant to fall back on, and none is specced. An escape hatch
left in a design document is a feature someone builds.

**Never show a percentage.** "12 of 20" and "3 left this week" are better numbers and
they're the language the project already speaks. Tabular numerals are specced for
exactly this.

**Keep tasks-done and days-worked separate.** They are different numbers and both are
true. Tasks-done drives the month bar; days-worked replaces the streak. Blending them
makes both meaningless.

---

## 11. Design direction

**Status:** partial · everything but the fonts. The palette, the tokens, the
empty state and the shell's type scale are built (slice 03), the stamp is built
(slice 06) and the wall's own type scale is built (slice 07). The two self-hosted faces are outstanding on D-10, and the
stamp's grid face is where that shows most: a country name is set to fit ninety
pixels on a system sans, and a condensed grotesque would let it breathe.

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
  random rotation and offset, in that person's ink, over the person's name, the
  country, the month, and the focus. It's the only place motion is allowed. It lands
  **once per viewer** — a watermark against `earned_at`, per §8 — rather than once
  ever: the phone that earned it, the wall in the kitchen, and the other two people on
  next open each get the moment exactly one time.
- Everything else stays quiet. Task cards are plain rectangles with generous hit
  targets. Respect `prefers-reduced-motion`, visible focus rings, works at 360px.

Empty states are invitations: an unstarted month says "Pick a country to start
September," not "No data." The empty passport grid is the purest form of this and it
carries the first four weeks of the year.

---

## 12. Library editor

**Status:** built · slice 08 built all of it but the worksheet layout editor,
which arrived with its table in slice 10.

Tasks, focuses, and project types are all editable in the app. Parent-facing, behind
`ADMIN_TOKEN`, not part of the kid experience.

**Task list** — every template, filterable by week, tier, focus weight, and workbook
page. Shows how many times each has been drawn and by whom, so it's obvious which
ones are dead weight. Inline edit for title, prompt, week, tier, workbook page,
and the worksheet layout the task's printed segment uses (§16). New tasks default
to `origin = 'custom'`.

**Focus editor** — name, blurb, and the weight grid: that focus against every week 2–3
task, each cell cycling `off / 1 / 3`. Editing weights one form field at a time would
be miserable at 50 tasks. The grid writes sparsely — cells left at 1 store no row.

**New focus flow** — because weights are sparse and missing means 1, a newly created
focus is immediately valid with zero rows and can be tuned afterward. Warn if a focus
has fewer than **15 tasks at weight ≥1 in either week 2 or week 3**, since the draw
takes five from each week and needs headroom. Counted per week, not summed: a focus
rich in week 2 and bare in week 3 draws the same five tasks every month just as
surely as one bare in both. Against the library's twenty-five templates per
week nothing is thin, seeded or custom: a focus with no weight rows at all still
counts twenty-five in each week, because a missing row means 1. The warning is
live for a library someone has archived their way through, not for this one.

**Worksheet layout editor** — the dozen printed forms of §16: name, kind, height
in thirds, and that kind's own knobs. Every field is a named value the renderer
reads and escapes; there is no markup field, here or anywhere, because this form
is the one place a typed string reaches a printed page. Editing a layout changes
every task bound to it, which is the point of there being twelve rather than
ninety — and it is why the editor shows the bound count beside each one. The
form is drawn from the knobs the server sends with the payload, so a knob added
to a kind appears in the editor with no second list to keep in step. The task
list carries the matching column: which form each template's segment prints as,
or ruled lines.

**People editor** — the three names, ink colors, and display order. This is where the
family names itself; nothing about it belongs in a seed migration.

**Country editor** — hooks and focus affinities per country, same shape as the task
list. Generated content needs a spot check, and a wrong hook is one tap to fix or
delete. **Hooks are the one thing in the library that can be deleted**, and the
archive rule is exactly why: `archived = 1` exists because `plan_tasks` and
`month_plans` reference templates, focuses and project types, so a hard delete
would break a month already in progress. Nothing references a hook. A junk hook
with no correct hook to type over it has nowhere else to go. Everything else
archives, and there is no delete button anywhere else on the page.

Affinities save as a set, the same shape as the weight grid: each of the six
focuses is off, 2 or 3, and off stores no row.

**Project type editor** — name, materials, and the ordered week-4 sequence. These are
sequences, not draws, so ordering is drag or up/down buttons.

**Edits propagate live.** `plan_tasks` joins to `task_templates` rather than copying
text, so fixing a typo fixes it everywhere including active months. That is the desired
behavior most of the time. The exception is rewriting a task into something different
mid-month — for that, archive the old one and create a new task.

**Seed re-runs never clobber edits.** Seed migrations upsert on `slug` with
`INSERT ... ON CONFLICT (slug) DO NOTHING`. Once a row exists, the seed leaves it alone
forever.

**Export and import** — `GET /admin/api/library.json` dumps tasks, focuses, project
types, weights, hooks, affinities, and the worksheet layouts with each task's
binding, as JSON, and `POST` to the same path reads one back. This is the backup, and it's how a tuned library gets carried into next school
year without a terminal.

Every row in the file is keyed on a natural key — slug for tasks, focuses,
project types and layouts, ISO3 for countries — and never on an id, because a restore lands in
a database whose numbering nobody controls. The import upserts on that key and
**never deletes**: a row already present is compared field by field and written
only where it differs, so importing a file twice reports nothing changed both
times. A row whose anchor is missing — a task naming a project type this database
does not have, a hook naming an unknown ISO3 — is skipped and counted rather than
written with a dangling reference. A task naming a layout that is missing is the
one exception: it keeps everything else and loses only the binding, because a
task with no layout prints ruled lines and that is a complete page, where
skipping the task would leave the week one short.

---

## 13. Seed data

**Status:** built · the runner, 3 people, 6 focuses, 6 project types, 195
countries, **90 task templates**, 87 focus weights, `003_country_data.sql`'s 222
hooks and 200 affinities across 100 countries (slices 02 and 09), and
`005_worksheet_layouts.sql`'s twelve printed forms with a binding on every week
1–3 template and on each project type's planning step (slice 10).

Seed files are not migrations (§3). They live beside them in `/src/migrations/`
and are exported from the same index as `SEEDS`, but they are re-run by **Run
seed** on every press rather than applied once, and every insert is
`ON CONFLICT ... DO NOTHING` on the row's stable key — `slug`, or `iso3` for a
country. Two consequences, and both are load-bearing: a row that exists is never
touched again, so an edit made in the library editor survives every future
press; and the file itself can grow, which is how the library reached a database
that was already seeded and carrying a month of real work.

- `001_schema.sql` — tables and indexes. A migration.
- `002_seed.sql` — people, focuses, project types, countries, task templates,
  weights. A seed.
- `003_country_data.sql` — hooks, focus affinities, revised research depth.
  A seed. Its hook insert is guarded on the country rather than conflict-keyed,
  because a hook has no natural key and a deleted one must stay deleted (§9).
- `004_worksheets.sql` — the `worksheet_layouts` table and the two columns it
  hangs off `task_templates` (§16). A migration: DDL, applied once, never edited.
- `005_worksheet_layouts.sql` — the twelve layouts and the binding for every
  week 1–3 template. A seed: the layouts upsert on `slug` like every other
  seeded row, and each binding is written only where the column is still empty,
  so a task rebound in the library editor keeps what was chosen there.

Contents of `002_seed.sql`:

- **3 placeholder people**, renamed on `/admin` rather than by editing SQL. Ids
  are explicit here and only here: `people` has no natural key to conflict on,
  so the id is the key and a second press must not mint a fourth Person 1. The
  three inks are one deep purple, one lilac and one blue — `#5B2A86`, `#D07AC0`,
  `#2E6FD9` — distinct in hue on screen and ~26% / ~61% / ~41% grey on a home
  printer, which is what keeps three stamps apart on a photocopied passport.
- **6 focuses and 6 project types.** Each focus carries a blurb written to a 5th
  grader; each project type a freeform "what you'll need" the week-4 gather task
  points at.
- **195 countries** with continent, region and `research_depth`, unadorned here —
  hooks and affinities are `003`, which also corrects the adventure level on the
  countries whose hooks proved the first pass wrong. The conflict key is `iso3`,
  so a name can be corrected without minting a second row for the same country.
- **90 task templates** and **87 focus weights**. The floor that makes the draw
  work at all is 27 — a 5-template week draws all of itself and leaves Swap with
  no candidate, and one project type's week 4 is 5 rows on its own. The library
  is far past that floor because the floor sizes the pool for the **draw**, and
  the draw is not what runs out. Five tasks come out of a week however deep it
  is, so depth costs the kid nothing. What depth buys is nine months that differ
  from each other, and a focus that still means something in month nine.

| Week | Templates | Note |
|---|---|---|
| 1 | 10 | 4 `core` — flag, map, location/borders, language & writing system — plus 6 competing for the 5th slot |
| 2 | 25 | one pool with week 3; five drawn per week, the spare is what makes Swap and nine months work |
| 3 | 25 | same |
| 4 | 30 | five for each of the six project types, as ordered sequences |

`LIBRARY_v3.md` takes weeks 1–3 to 12 / 86 / 69 and the focuses to nine. Until it lands
these are the seeded numbers.

All six project types carry a full week-4 sequence, so setup offers all six.

**Tier means what is drawn, not how hard it is.** `core` is fixed and always
included — week 1's four, and all five week-4 rows. `focus` is the
focus-weighted pool, weeks 2 and 3. `wild` is eligible but off the main line:
week 1's fifth-slot candidates.

`task_focus_weights` stores only an opinion: 3 for on-theme, 0 to exclude,
nothing in between, and no row at all for neutral. `LIBRARY_v3.md` replaces it with
`focus_tags` × `prompt_tags`, at which point the per-week assertion below goes away with
the per-week draw (§4) and is replaced by one on the merged pool: every focus holds at
least ten prompts the focus audit calls on-theme. Until then: every focus
holds **six** weight-3 tasks in week 2 **and** six in week 3 — per week, because
the draw is per week, so a focus with an opinion about only one of them leaves
the other identical to picking no focus at all; and six rather than three
because against a 25-task pool three on-theme tasks put barely one of them in a
draw of five, while six put two or three. And no focus may exclude more than one
task in a week: exclusions eat the spare that Swap draws from, and the headroom
a wider pool buys is for content, not for exclusions.

**Every week 1–3 template is bound to one of the twelve layouts**, in
`005_worksheet_layouts.sql` (§16). The heights are the load-bearing half: a
sheet holds three thirds, so the mix decides how much paper a month is. Twenty-
one templates rule four lines, seventeen sketch beside notes, and only nine take
two thirds or three — which puts a drawn month at seven to nine sheets rather
than the twelve a library of drawing boxes would print.

Week 4 is bound differently, because its sheet is composed rather than packed:
only each project type's planning step carries a binding, and it is what tells
the renderer which task the storyboard belongs to.

Every `prompt` is written in second person to a 5th grader, one clear action,
finishable in ten minutes. "Find out which animal is on their money and draw it"
— not "Research national symbolism." And **no task is country-specific**: the
same prompt has to work in Peru and in Japan, which is what lets a kid change
countries at any point in the month.

**Five templates carry the family's lens, and five is the size of it.** This is
a Sabbath-keeping Christian household, and the library reflects that the way a
family's own curriculum does: as a few tasks that look at a country through it,
not as a frame over all ninety. Two sit in week 2 — `kingdom-over-this-place`
reads Micah 4:1-4 against something the country is struggling with now, and
`desert-shall-blossom` reads Isaiah 35:1-2 against its most worn-out land. Three
sit in week 3 — `their-rest-day` asks which day the country actually rests,
`sabbath-keepers-there` looks for who keeps the seventh day there and what they
are called, and `feast-they-keep` reads Zechariah 14:16 against the country's own
harvest festival.

They obey every rule the other eighty-five do: one action, ten minutes, second
person, and **not country-specific** — every country has a rest day, a festival,
and something that needs fixing. A scripture reference is the one assertion a
task is allowed to make, because a citation is checkable; everything the kid is
asked to *find* stays a lead. The country hooks carry the same lens the same
way: where a country's own ground is where scripture happened — Israel, Jordan,
Turkey, Greece, Malta, Iraq, Egypt, Ethiopia — one of its two or three hooks
points at it, and elsewhere they do not.

The column rules and the paste-ready row forms for the hand-written lists are in
`../other/SEED-CONTENT.md`.

---

## 14. Build order

**Status:** n/a — the build order lives in `../slices/INDEX.md`

Ten slices, ordered so the deploy-and-migrate path is built before anything
that needs migrating, and so the end-to-end loop runs on a thin library before
the library is written. Each slice file holds the detailed instructions for
what it builds, its due-outs, its open questions, and its exit criteria.

Ship point is the end of slice 06: at that point the app does the whole
nine-month job for one person on one phone.

---

## 15. Decisions

Resolved:

- **Timezone.** One `FAMILY_TZ` Worker secret, `America/Chicago`. `local_date`
  computed at insert via `Intl.DateTimeFormat`. Weeks start Monday.
- **What the session cookie is signed with.** `ADMIN_TOKEN`, HMAC-SHA-256. No
  fourth secret. It buys one less field in the dashboard at the cost of tying
  the family's login lifetime to the admin credential — rotating `ADMIN_TOKEN`
  logs everyone out. Three Worker secrets total: `FAMILY_PASSCODE`,
  `ADMIN_TOKEN`, `FAMILY_TZ`.
- **Week 1 carries four core tasks, not six.** Week 1 is five slots and the
  20-tasks/20-weekdays mapping is what keeps "3 left this week" meaningful, so
  six always-drawn tasks do not fit. Flag, map, location/borders and language &
  writing system are fixed; basic stats and national symbols compete for the
  fifth slot with the rest of the week-1 pool. The cost is accepted: a month can
  end with no population figure and no national symbol on its page. Making
  either one core would spend the fifth slot entirely, and with it week 1's only
  variation and its only swap.
- **What breaks a streak.** Nothing, because there is no streak. See §10.
- **Week 4's "present" task needs no audience beyond whoever is home** (Q-11).
  All six sequences end "present it to your family," and nothing in the app
  schedules a presentation night or asks whether one happened. A scheduled event
  would be the app asserting a household commitment nine times a year that it
  cannot see and cannot enforce; the first month it slips, six templates are
  telling a kid to do something that is not going to happen. Whoever is in the
  kitchen is a real audience, and it is the one that is always there. See §13.
- **The library carries the family's lens in five templates, not as a frame.**
  Five of ninety look at a country through the Sabbath and the coming Kingdom,
  and the country hooks point at scripture's own ground where a country has it.
  The alternative — a seventh focus — was rejected: a focus is a *draw weight*,
  so it would make the lens something a kid picks instead of something the year
  quietly contains, and it would need six on-theme tasks in each of weeks 2 and
  3 to satisfy §13, which is eighteen more templates and a much heavier hand
  than intended. See §13.
- **A hook is re-seeded per country, not per hook.** `country_hooks` has no
  natural key, so `003`'s insert skips any country that already holds a hook
  rather than conflict-matching the text. It is what makes the editor's one
  delete stick through the next press of Run seed, and it means a hook added to
  the file for an already-seeded country will not land — that edit belongs in
  the editor, exactly as a corrected task template does. See §9.
- **Country hooks are the one thing in the library that deletes.** Everything
  else archives, and the reason is structural rather than a policy: `plan_tasks`
  and `month_plans` hold references to templates, focuses and project types, so a
  hard delete would break a month already in progress. Nothing holds a reference
  to a hook. A generated hook that is simply wrong, with no correct hook to type
  over it, would otherwise sit on the country card forever. See §12.
- **The thin-focus warning counts per week, not summed.** Fifteen tasks at
  weight ≥1 in week 2 *and* fifteen in week 3. The draw takes five from each week
  independently, so a focus with thirty in one week and four in the other is not a
  focus with headroom. See §12.
- **Can a past week's tasks still be checked off?** Yes. No lockout, ever. A lockout
  converts a missed day into a permanently dead card, which is the exact opposite of
  what a passport stamp is for.
- **Does the parent need an override to edit a kid's plan?** No mechanism needed —
  there are no roles, so everyone can already edit everything. The parent's real
  override is the library editor and Reset month, both behind `ADMIN_TOKEN`.
- **Where the month boundary sits.** `month_plans.start_date`, set at setup, is
  **always a Monday**: the later of the month's first Monday and the Monday of the
  week setup happens in. Weeks are 7-day windows from there, week 4 absorbing the
  remainder. A Monday anchor is what keeps `week_no` and the calendar week ring in
  agreement and makes five tasks map to five weekdays; taking the later of the two
  keeps a late start from dumping ten unseen tasks onto the carry-forward strip. Plans
  are keyed on `month`, so one running past the end of its month collides with
  nothing.
- **Redraw and the swap budget.** No `redraws_used` column and no `swaps_used`
  column. Redraw is unlimited until the first check-off and refused after it, the
  same gate change-focus already sits behind; a redraw resets the derived swap
  count, which is right, because it also destroys the tasks those swaps bought.
  One rule covers both: before the first check-off everything is free and
  resettable, after it the plan is fixed. See §4, §6.
- **What completion is gated on, and who can do it.** Twenty of twenty, and
  nobody in particular. There is no completion button — the twentieth check-off
  raises the offer and there is no control before it, because one that exists in
  week two gets tapped in week two and burns the stamp. Completing is open to the
  family for the same reason checking off is: it *is* a check-off, and a parent
  finishing a month beside a kid is the normal case. Un-completing is open too
  and guarded by a confirm step rather than a role, which is the only guard this
  app has. See §7 Passport.
- **What a stamp records.** person, country and focus denormalized off the plan
  at the moment it is written, not joined live. Country is editable at any time,
  including after the month is over, and a passport whose February changes when
  somebody corrects a typo in March is not an artifact. The plan stays editable;
  what it says about a finished month does not.
- **Which nine months the passport draws.** The later of today's month and the
  newest month anyone has a plan for; with no plans at all, the month setup would
  open. Inside the school year that is today's month. Over the summer June and
  July show the year just finished — the one you print — and August follows the
  first September set up early, rather than hiding the stamp it earns until the
  1st. See §7 Passport.
- **What the wall cookie can reach, and what re-issues it.** Two routes —
  `GET /api/wall` and `GET /api/wall/version` — and `POST /api/auth`, which is
  the only exemption from the write ban and the only way a tablet whose year has
  run out gets back in. It cannot set a person and never carries one, so the most
  it can win is another wall cookie. Everything else is 403, reads included: an
  allowlist rather than a list of banned methods, so a route added by a later
  slice is refused by default rather than by remembering. See §6, §8.
- **How the wall decides the screen has changed.** Inequality on
  `MAX(stamps.earned_at)` and `MAX(plan_tasks.completed_at)`, never `>`. Both
  move backwards — undo nulls one and un-completing deletes the row behind the
  other — and a growth comparison leaves the kitchen stale until the next stamp.
  The version is read before the payload, so the failure direction is a wasted
  fetch rather than a stale wall. See §8.
- **How many devices a person gets.** As many as they like. Identity is per-device and
  nothing server-side is device-bound. See §2.
- **Names and ink colors for the three people.** Three placeholder rows are
  seeded, because a person row has to exist before anyone can pick themselves at
  first run, and every change after that is made on `/admin`. The three inks —
  `#5B2A86` deep purple, `#D07AC0` lilac, `#2E6FD9` blue — are chosen to stay
  separable as greys on a home printer. See §3, §13.
- **Static shell, not a Worker-rendered one.** The family app is
  `public/index.html`, served by the assets binding. The alternative — rendering
  it from the Worker the way `/admin` is — was rejected on what it costs to
  retrofit: a service worker precaches a static file, where a Worker-rendered
  page means caching a navigation response instead, and the shell already has
  nothing server-side to render. It carries no session state and no person's
  name; every screen on it comes from `GET /api/me`. Neither choice precludes a
  service worker, and this one makes it a shorter file. See §2, §7.
- **Which route sets the person.** `PATCH /api/me`, not a second field on
  `POST /api/auth`. Identity is a property of "me", and keeping it off the auth
  route is what keeps §8's wall exemption a whole-route exemption rather than a
  field-level one — the wall can re-authenticate itself and can never pick a
  person. See §2, §6.
- **How `/api/catalog` invalidates.** An ETag over the body plus
  `Cache-Control: no-cache`. The browser does the caching; a corrected hook
  reaches a device that already loaded the old one. See §6.
- **The school year is September through May**, nine months and 27 stamps. The
  empty state names the month it would open and the passport grid is nine rows.
  Setup refuses a month outside the year rather than making one that the passport
  has no slot for. See §7.
- **Where the focus preview's titles come from.** `GET /api/focuses/:id/samples`,
  one request per focus tapped, rather than three more strings on every
  `/api/catalog`. The catalog is fetched on every launch by every screen and
  reaches 195 countries; the preview is read on one screen 27 times a year. The
  cost is a request on first tap, paid once per focus per page. See §6, §7.
- **How setup learns the family's stamped countries.** `GET /api/passport`,
  loaded alongside the catalog. `/api/me` is fetched on every launch and every
  return to the tab, and the stamped set is read by one screen — putting it there
  would carry it 180 times a month for the 27 times it is used. The passport
  endpoint has to exist for §7's passport screen regardless, so this builds it
  rather than duplicating it. See §6, §7.
- **What decides which day it is.** `FAMILY_TZ`, read server-side and returned by
  `GET /api/me` as `today` and as the month setup would open. The client never
  computes it: the device's clock is wrong on a trip and the Worker answers from
  wherever it runs. See §5, §7.
- **Who can reroll a plan.** Its owner only. This is the one exception to "there
  are no roles" and it is not one: reading a plan is open to the family, and what
  is refused is a sibling on a shared phone redrawing someone else's month. See
  §6.
- **When a check-off writes a session.** Only on an `open → done` transition.
  `PATCH /api/tasks/:id` is idempotent — it sets the state it is given and 200s
  whatever the task was already in — and writing a session unconditionally would
  make two devices, or one double-tap, count two days. Days worked is the one
  number §10 promises never lies, and over-counting is the way it would start.
  A real second sitting on a finished task goes through `POST /api/sessions`,
  which is the route for writing a session without touching a task. See §6, §10.

- **What a printed worksheet is a worksheet of.** A sheet, not a task. A
  10-minute task fills about a third of a page, so the printed unit is a sheet
  packed with segments and the reusable part is a library of ~12 **layouts**
  that many templates bind to — not ~90 bespoke worksheets, most of which would
  be the same box twice. See §16.
- **Nothing about a printed month is stored, and no plan is ever finalized.**
  `GET /print/:planId` renders live from `plan_tasks`. A stored set of pages
  would need a freeze to stay true, and §4's plan is deliberately unfrozen —
  redraw, change-focus, three swaps, project type, country. "When the month is
  finalized" is the end of the reveal and the Plan screen, which are places, not
  an event. See §16.
- **Paper is US Letter, and sheets pack by the week.** 0.5in margins, a 7.5 ×
  10in printable area, a segment measured in thirds of it (D-13). Each week
  starts a new sheet so a mid-month swap reprints one week instead of the month,
  at a cost of up to two blank thirds a week. See §16.
- **Week 4 gets one sheet and four of its five tasks get none.** Week 4 is
  production, not research; a ruled page under "rehearse it twice" is a page
  that goes in the bin. What prints is the project type's materials as a
  checklist, the five steps as check-off lines, and a storyboard. See §16.

**Still open.** Open questions are tracked in `../other/OPEN-QUESTIONS.md`, each
assigned to the slice it blocks. Four are outstanding. They are answered before
the code that depends on them is written, never guessed.

---

## 16. Printed worksheets

**Status:** built · slice 10

The physical looseleaf workbook is the point of the project (§1, §7). Twenty
tasks a month arrive as prompts on a phone and land on paper the kid has to
rule, title and lay out themselves before any of the ten minutes goes into the
work. This section is what turns a drawn month into the pages that go in the
binder.

**The output is a month's pages, not a task's page.** A single 10-minute task is
worth about a third of a sheet. Printing one per sheet wastes two thirds of
seven sheets a month per person and produces a binder nobody can flip. The unit
is the sheet, composed of segments.

### Three parts

- A **layout** is a reusable printed form — ruled lines, a drawing box with a
  caption, two labeled columns, a six-panel storyboard. There are about twelve
  and they live in the library alongside tasks and focuses.
- A **segment** is one task's slot on paper: its title, its `workbook_page`
  label, its prompt in full, and the layout under it. Bound at the template, so
  a task says which form it wants.
- A **sheet** is what comes out of the printer: a header band and the segments
  packed into it.

**Layouts are a library, not one worksheet per task.** Ninety bespoke worksheets
is ninety pieces of content on top of §13, and most of them would be the same
box twice. "Copy the flag" and "trace the outline and star the capital" want the
identical form. Twelve layouts plus one binding per template is the same result
for a twelfth of the writing, and it is the version the parent can keep tuning
in §12 without designing anything.

**`workbook_page` stays a label, not the unit.** It is what prints in the
segment's corner so the page has a name — the same string the task card shows on
the phone (§7), so the kid reads the same word in both places.

### Thirds

Three segments to a sheet is the common case, not the rule. The flag task wants
half a page and "write hello two ways" wants four lines; forcing both to a third
gives one a cramped box and the other a field of white.

So a layout declares its height in **thirds** — 1, 2 or 3 — and the sheet holds
three. US Letter at 0.5in margins is a 7.5 × 10in printable area (D-13). The
header band takes 0.62in off the top of that, so a third is 7.5 × 3.13in, which
is a comfortable drawing box and about eight ruled lines. Thirds are measured
against what is left under the band rather than against the paper: measured
against the paper, three full-height segments and a band would not fit, and the
last one would fall off the sheet.

All of it derives from `--page-margin` and `--band` in `public/css/print.css`. If
a home printer's unprintable margin clips a segment, the margin moves in one
place and every layout follows.

### Packing

Segments pack in `plan_tasks.position` order and are never reordered. The
printed order has to match the order on the phone or the kid cannot find the
page the card is pointing at.

**Each week starts a new sheet.** Five tasks is usually two sheets, so a month is
about seven, and the binder gets week dividers for free. The real reason is
containment: a swap on day eight changes one segment, and a segment whose height
differs from the one it replaced reflows everything after it. Bounded at the
week, a reprint is one or two sheets. Packed across the month, it is the month.
The cost is up to two blank thirds a week, which is the cheapest thing on this
page.

### What prints

**Weeks 1–3: every task gets a segment.** A template with no binding falls
through to a default of **one third of eight ruled lines** under the prompt, so
the binder never has a hole and printing works before a single layout is bound —
the same built-and-inert pattern the country hooks use (§7). "Applicable" means
a task has a bespoke form, not that it has a page.

One third rather than two is what keeps an unbound month at seven sheets. The
same twenty tasks bound to drawing boxes and tables run to eight or nine, and
that extra paper is exactly what the bindings buy.

**Week 4 is one sheet, and four of its five tasks have no segment.** Week 4 is
production, not research (§4): gather materials, two build sessions, rehearse,
present. None of those four is written into a workbook, and a ruled page under
"rehearse it twice" is a page that goes in the bin. What week 4 gets is a single
sheet carrying the chosen project type's `materials` as a checklist, the
five-step sequence as check-off lines, and a six-panel storyboard for the one
week-4 task that is genuinely planning work.

**Every segment carries its prompt in full.** The prompt is the instruction, not
a title (§7) — a sheet that names the task without saying what to do sends the
kid back to the phone, which is the friction the sheet exists to remove.

**The sheet header** carries the person's name, the country, the month, the week
and *sheet n of m*, ruled in that person's ink. **n of m counts within the
week**, not across the month: a week reprinted after a swap has to produce the
same sheets it did the first time, or it cannot drop back into the binder. The three inks were chosen to
stay separable as greys on a home printer (§13), which is what keeps three
people's pages apart on the table.

**Print is ink on white.** The app's deep navy ground (§11) does not follow the
page: a full-bleed dark background is a print job nobody would run twice. The
print document is its own stylesheet with its own `@page` rules and shares
nothing with the app shell but the type scale.

### The route

`GET /print/:planId` — a Worker-rendered document behind the family cookie,
served the way `/admin` and `/wall` are and not under `/api/`. The app shell is
a static mobile-first document (§2) and a print stylesheet bolted onto it would
spend the whole slice fighting it.

`?week=N` prints one week, and it is what every button in the app points at. It
is also the only way to print a single task's sheet — there is no per-task print
button, because the answer to "print this one task" is a third of a page.

**The wall cookie is refused.** The wall has no person and nothing on it should
open a print dialog (§8).

**The document carries its own Print button**, sticky at the top of the screen
view and absent from the paper. The browser's own route to a print dialog is a
share sheet on a phone — Print buried among upload targets, and missing from the
menu outright on some Android builds — and a page whose only purpose is to be
printed cannot depend on the reader finding it. The button calls
`window.print()` and nothing else; the dialog is not fired on load, because a
tab that opens into a dialog hides the sheets it is about to print, and Save as
PDF is one choice inside that dialog rather than a second path to build.

### Nothing is stored, and nothing is finalized

There is no `finalized_at`, no generated artifact, no R2. `GET /print/:planId`
renders live from `plan_tasks` every time it is asked.

A stored set of pages would need a freeze to be correct, and the plan is
deliberately not frozen: redraw and change-focus are unlimited until the first
check-off, three swaps run after it, project type changes until week 4 and
country changes any time (§4, §6). Anything printed at a moment and kept goes
stale the first time one of those is used, and the fix — invalidating stored
pages on five different writes — is a cache to maintain for a document that
takes one query to rebuild.

So "when the month's tasks are finalized" is a **place, not an event** — and the
place is a week, not a month. **Print week** sits beside every week's heading on
**Plan**, which is the reveal on the day the month is drawn and the page anyone
opens for the shape of the month afterwards.

**The trigger is the week because the sheets break on the week.** Printing all
four weeks the day the month is drawn puts weeks 2 and 3 on paper a fortnight
before anyone reads them and a swap away from being wrong — and the fix,
reprinting, reprints weeks 1 and 2 that nothing changed. Printing a week at a
time means a swap on day eighteen costs one or two sheets and leaves everything
already in the binder alone. There is no month-wide button; `/print/:planId`
with no `?week` still renders all four and nothing in the app links to it.

A swap says which week it was in, so the toast that reports it is also the
reminder to print that week again.

### Layout specs are data, not markup

A layout carries a `kind` and a JSON `spec` of named knobs — line count, caption
text, column headers, panel count. A template may override those keys for its
own segment.

**A layout's spec is complete; a template's is a patch.** A layout carries every
knob its kind has, so the editor's form is the whole form. A template's override
carries only the keys it changes, and is merged over the layout's key by key —
an override that filled in the rest would silently replace values the parent
typed with defaults nobody chose.

**The renderer never takes markup from the database.** It reads the keys it
knows for that `kind` and escapes every string it prints. The library editor
(§12) lets a parent type into these fields, and a `spec` that could carry HTML
would make the printed page an injection surface reachable from a form.

### What it cost

`004_worksheets.sql`, a migration adding `worksheet_layouts` and two nullable
columns on `task_templates` (§5); `005_worksheet_layouts.sql`, a seed carrying
the twelve layouts and the binding for every week 1–3 template; one route, one
print stylesheet, and the layout tab of §12.

The DDL and the rows are two files because they are protected by opposite rules
(§3): SQLite has no `ADD COLUMN IF NOT EXISTS`, so the ALTERs cannot be in a file
Run seed re-executes — and the layouts and bindings have to be in one, or they
could never be corrected without reading as drift.
