# Globetrotters

Companion app to a family research project: three people — one parent, kids aged
11 and 12 — each research one country per month, September through May, ~10
minutes a day, 5 days a week. Physical looseleaf workbooks hold the actual
written work. This app tracks what has been done, points the way each day, and
holds the shared family passport.

Cloudflare Worker, D1, browser-only migrations. Nothing in setup, migration,
seeding, or deploy requires a terminal.

---

## The map

| Path | What it is |
|---|---|
| `CLAUDE.md` | Directives for every session. Read first. |
| `docs/design/DESIGN.md` | The spec. Each section carries a completion marker. |
| `docs/design/LIBRARY_v3.md` | Every form, every prompt, the tag/focus weights and the draw |
| `docs/slices/INDEX.md` | The thirteen slices, in build order, with status |
| `docs/slices/NN-name.md` | One slice: instructions, due-outs, questions, exit criteria |
| `docs/other/DUE-OUTS.md` | What the owner must provide, by slice |
| `docs/other/SEED-CONTENT.md` | Column rules and row forms for the hand-written seed lists |
| `docs/other/OPEN-QUESTIONS.md` | Questions blocking build, and answered ones |
| `docs/other/FOCUS-AUDIT.md` | Which focus each prompt actually serves, judged by hand |
| `src/` | The Worker: entry and routing, `/api/*`, `/admin`, `/print`, `lib/`, `migrations/` |
| `public/` | Two static documents — the family app and the wall — the app stylesheet and the print stylesheet, eleven JS modules |
| `test/` | `node --test test/*.test.js` — no dependencies, no install |

## Where things stand

**Slices 00 and 01 are built.** A commit on `main` becomes a running Worker with
no terminal step, and `/admin` — behind `ADMIN_TOKEN`, linked from nowhere —
lists the migrations, applies the pending ones, and shows schema version and
row counts on `/admin/health`. `001_schema.sql` carries every table in §5.

**Slice 02 is built.** `/admin` now also has **Run seed** and the people editor:
three names and three inks, changed in a browser. `002_seed.sql` carries the
three people, nine focuses, six project types, 195 countries and the task
library — enough to draw a real month, and enough that the focus a kid picks
every month does not hand back the same week every month. `GET /api/catalog`
serves the picker's one fetch with an ETag, so a row corrected in the editor
reaches a device that already cached it.

Seed files are not migrations. `src/migrations/index.js` exports `MIGRATIONS` —
checksummed, applied once — and `SEEDS` — re-run in full on every press, every
insert `ON CONFLICT DO NOTHING`. That is what lets the seed grow later without
reading as drift, and what makes a correction in the library editor permanent.

`/admin` also carries **Erase everything**, which drops every table and the
migration ledger with them. Apply pending and Run seed then rebuild the database
from the files, which is what makes a schema file editable in place instead of
appended to: a CHECK constraint SQLite will not alter is an edit and three button
presses. It asks you to type `erase everything` first, and there is no undo.

**Slice 03 is built, except its fonts.** The family passcode gets you in once
per device, `PATCH /api/me` writes which of the three people you are into the
same signed cookie, and the cookie is re-issued on every authenticated response
so its year slides forward instead of expiring in March. Everything under
`/api/` is behind that cookie except `POST /api/auth`, which is what issues it —
and, from slice 07, the two wall routes, which a second cookie type reaches
instead.

The shell is a static `public/index.html` and eleven vanilla modules — no build
step, no framework, no third-party request on any page load. Passcode → person →
"Pick a country to start September", at 360px.

D-10, the two licensed font files, is outstanding, so the shell runs on a system
stack. Swapping them in is an `@font-face` pair and two token values in
`public/css/app.css`, plus a re-tune of the type scale.

**Slice 04 is built.** A kid picks a country — browse by continent, search all
195, or "Deal me three" — then a focus, then what they will make, and lands on
twenty tasks for the month. The draw lives in `src/lib/draw.js`: four fixed
week-1 tasks plus one drawn, two focus-weighted Deep Dive weeks, and week 4's
project sequence. A focus weight of 0 excludes; everything else is scaled by how
long since that person last drew it, so a task drawn last month scores half a
fresh one and nothing is ever locked out.

Everything on the reveal is free until the first check-off and fixed after it:
redraw, change focus, change what you'll make. Country is free always, because no
task is country-specific. `start_date` is always a Monday — the later of the
month's first Monday and this week's — so a September 20th start lands in week 1
rather than backdating a kid into week 3.

Three things on the setup screen were built inert in this slice and came alive
with slice 09's content, no client change: the hook line on a country card, the
recommended focuses with their reason lines, and "Deal me three", which is
offered because 100 countries now carry at least two hooks.

**Slice 05 is built** — the daily loop, and the screen the app is mostly made
of. This week puts one card up, not five: the lowest-position open task in the
current week, with the prompt at the largest type on the phone and the workbook
page it feeds under it. **Done** completes it and writes a session; **Worked on
it** writes a session and leaves the card open, which is the two-sittings case
the schema was built for. A repeated `done` writes no second session, so days
worked cannot be inflated by a double-tap, and **Undo** leaves the session rows
alone, so it cannot be deflated by a mis-tap either.

Nothing is ever locked out. A missed Tuesday shifts forward, and unfinished
tasks from earlier weeks sit on a carry-forward strip that still checks off in
week 3. Progress is two numbers and no streak: a 0–5 week ring labelled with
what is left — "3 left this week" — and "12 of 20" for the month. Never a
percentage.

Plan holds everything month-scale: all twenty tasks, swap with its remaining
budget, the month's notes accumulating down the page, week 4's materials from
week 1, and days worked.

**Slice 06 is built, and that is the ship point** — the app does the whole
nine-month job for one person on one phone. Completion is a consequence, not a
button: there is no control anywhere until twenty of twenty, and then the
twentieth check-off raises the offer on the card itself — "That's twenty. Ready
to stamp Peru?" The headline is chosen from the month's notes rather than
composed, because a kid asked to summarize a month at the moment they most want
to be done writes "it was fun"; it is editable afterwards, and it may stay blank.

Accepting routes to the passport, where the stamp lands. The grid is the whole
year from day one — three columns, nine rows, September through May — because an
unfilled passport is a far stronger invitation than an absent one. A month
somebody is still working shows the country without a stamp and a month nobody
started says so, which puts "who hasn't started yet" on every phone. The stamp
carries the person, the country, the month and the focus in that person's ink,
at a slight angle, and it lands with the one animation this app allows — once
per viewer, so the phone that earned it, the wall in the kitchen and the other
two people on next open each get the moment exactly once. It prints to one sheet
of US Letter, all three inks legible in grey.

**Slice 07 is built** — the wall. `/wall` is the kitchen tablet: the family stamp
count as the headline, three columns of country, focus and week ring in fixed
order, and the passport grid underneath. It is read-only and that is enforced at
the router, not by leaving controls out: the wall has its own cookie type, and a
request carrying it reaches two read routes and is answered 403 everywhere else,
so the tablet in the room guests stand in is not holding a full-write family
cookie for nine months. It heartbeats every five minutes against two aggregates
and fetches the view only when they move — a 30-second poll of the payload is
three orders of magnitude more database reads for a screen that changes about
three times a day.

The month count is deliberately absent, from the screen and from the payload
both. Three people doing an identical twenty-task structure side by side is
implicitly a leaderboard; a 0–5 week ring survives that because it resets Monday,
and "9 of 20" beside a sibling's "17 of 20" does not. The family number is the
one that gets to be huge.

A stamp earned on a phone lands on the wall within five minutes, full-screen for
about half a minute, before settling into the grid — two inside one window queue
and land in turn. The watermark that stops it replaying lives in `localStorage`
and is seeded to the current time, so a rebooted tablet comes back to the wall
with no passcode and replays nothing.

**Slice 08 is built** — the library editor. `/admin/library`, behind the same
token and linked only from `/admin`: the task list with every template's draw
count and by whom, the focus editor with its tag grid, the project type editor
with its week-4 sequence, and the country editor for hooks and focus fits. Nothing is deleted — `archived = 1` takes a template out of future draws
and leaves every month already drawn intact — with one exception: a country
hook, which nothing references, and which a wrong generated line has nowhere
else to go from.

Edits reach an active month with no republish, because `plan_tasks` joins to
`task_templates` rather than copying the text. The tag grid writes sparsely: a
cell at 0 is the absence of an opinion and stores no row, and a cell moved back
to 0 deletes the row it had. A focus created with no tags at all draws
immediately, and the page warns when a focus's tags match no prompt at all —
which is the only way left to make a focus mean nothing, since a tag weight can
only ever favour.

`GET /admin/api/library.json` is the backup and `POST` to the same path reads
one back. It is keyed on slugs and ISO3 codes rather than ids, so it lands in a
database whose numbering nobody controls, and the import upserts rather than
replaces: importing the same file twice reports nothing changed both times.

The one part not built is the worksheet layout editor, which moved to slice 10
because the table it edits arrives there.

**Slice 09 is built** — the content, and the thing that decides whether the app
is good rather than merely working. The library is **91 task templates**: ten in
week 1, fifty-one across weeks 2 and 3, and a five-task sequence for every one of
the six project types, so setup offers all six. `003_country_data.sql`
adds **222 hooks and 200 focus affinities across 100 countries**, chosen for
spread across continent, adventure level and focus, and it corrects the
adventure level where writing a country's hooks proved the first pass wrong.

Every hook is a lead — "Find out what is carved into the desert at Nazca" — and
never an assertion, because a few hundred hand-written hooks will contain errors
and the phrasing decides whether an error costs a dead-end search or a false
sentence copied into a workbook. Five of the ninety-one templates carry the
family's Sabbath and Kingdom lens, and five is the deliberate size of it.

Re-running the seed cannot duplicate a hook or resurrect a deleted one: hooks
have no natural key, so the insert skips any country that already holds one,
which is what makes the editor's one delete stick.

**Slice 10 is built.** A drawn month comes out of the printer as the pages that
go in the binder (§16). Twelve reusable layouts — ruled lines, drawing boxes,
two labelled columns, a six-panel storyboard — each declaring a height in thirds
of a page, and one binding per template says which form a task wants. Segments
pack in position order, three thirds to a sheet, a week to a sheet-run, and no
segment ever crosses a page break. Week 4 is one composed sheet: the project
type's materials as a checklist, its five steps as check-off lines, and a
storyboard for the one task that is planning work.

**Print week** sits beside every week's heading on Plan, and there is no
month-wide button. The sheets break on the week, so printing all four the day
the month is drawn puts weeks 2 and 3 on paper a swap away from being wrong, and
reprinting the month to fix one week reprints two that nothing changed. Sheets
are numbered within their week for the same reason: a week reprinted is the same
sheets it was.

Nothing is stored and no plan is ever frozen — `/print/:planId` renders live from
the plan every time it is asked, behind the family cookie, refused to the wall.
The renderer never takes markup from the database: every layout field is a named
value it coerces and escapes, which is what lets a parent type into these fields
in `/admin/library` without the printed page becoming an injection surface.

Its schema is two files. `004_worksheets.sql` is the migration — the table and
two nullable columns — and `005_worksheet_layouts.sql` is the seed carrying the
twelve layouts and the bindings. SQLite has no `ADD COLUMN IF NOT EXISTS`, so
DDL cannot live in a file Run seed re-executes; and layouts in a migration could
never be corrected without reading as drift.

**Slice 11 is built** — the merged draw. Weeks 2 and 3 stopped being two pools.
Eight prompts are drawn from one pool of 49 against tag weights, dealt four and
four, and joined by two pinned tasks: `wow-fact` in week 2 and `cook-it` in week
3. A month is twenty again, and a focus is never absent from a whole week of
paper — the failure the merge exists to fix ran at 20 to 90% of months.

A focus is now a set of weighted **tags** rather than an opinion about each
prompt. `prompt_tags` says what a prompt is about (`topic`) and how the answer
gets produced (`mode`); `focus_tags` says which topics a focus cares about, and a
prompt scores `1 + 2 x` the sum of the weights it shares. Two consequences worth
the change: a prompt tagged once at authoring time is drawn correctly by every
focus from then on, with no per-prompt row to write; and there is no way to
exclude, so nothing in the editor can starve the draw. The mode tags do what
topic tags cannot — no month draws two prompts sharing one, and the two wildcard
slots guarantee a month holds somebody from the country actually speaking.

The draw also refuses to print the same worksheet form twice in one week, which
five draws against twenty-seven forms would otherwise do about 40% of the time by
arithmetic alone.

**Slices 00 to 20 are built and the app does the whole nine-month job.** Two
remain: the twelve prompts Ancient World and Conflict and Change are still owed
(slice 21) and the affinities for the three focuses that have none (slice 22).
The pool is the 153 drawable prompts the draw was measured against, the
three-month cooldown never bites — the fresh pool never fell below 129 against
the eight a draw needs — and no drawable prompt is unreachable. Forms lead
prompts, because a binding points at a layout row that has to exist first; that
was the only forced ordering in slices 12 to 20.

Every Cloudflare due-out is closed, and so are the three inks, the school year
(September through May) and the paper (D-13 — US Letter). Three remain. Two block
no code: the fonts (D-10) — the shell, the stamp and the wall run on a system
stack — and which tablet the wall runs on (D-14), where the wake lock is
feature-detected either way and what is unresolved is whether the owner has to
set display sleep by hand. The third is D-15, twenty countries of affinity apiece
for the three focuses that have none, and it is the whole of slice 22.

Three questions are open: two in slice 15, which builds the renderers they
change, and one in slice 16.

The Worker's own tests run with `node --test test/*.test.js` and need nothing
installed. They are a build-session tool, not something the owner ever runs —
nothing about operating this app requires a terminal.
