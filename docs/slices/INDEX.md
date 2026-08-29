# Slice index

Twenty-two slices against `../design/DESIGN.md`. Each ends at a state you can open in a
browser and judge.

A build session takes the first slice not marked `built` and reads its file.
**Slices 00–11 are built.** What remains is the library the draw engine was measured
against — 106 prompts, 19 forms and 10 renderers — split into ten slices, none of them
larger than L. Also outstanding are due-outs D-10 and D-14, neither of them code, and D-15,
which is the whole of slice 21.

| # | Slice | Status | Band | Depends on | Design sections |
|---|---|---|---|---|---|
| 00 | [Deploy path](00-deploy-path.md) | built | M | — | §2, §3 (deploy half) |
| 01 | [Migration runner](01-migration-runner.md) | built | M | 00 | §3, §5 |
| 02 | [Seed v0 and catalog](02-seed-and-catalog.md) | built | M | 01 | §13 (partial), §6 (catalog) |
| 03 | [Auth and shell](03-auth-and-shell.md) | built | M | 02 | §2 (auth), §11 |
| 04 | [Setup, draw, reveal](04-setup-draw-reveal.md) | built | L | 03 | §4, §7 Month setup |
| 05 | [This week](05-this-week.md) | built | L | 04 | §7 This week, §7 Plan, §10 |
| 06 | [Completion and passport](06-completion-and-passport.md) | built | M | 05 | §7 Passport |
| 07 | [The wall](07-wall.md) | built | M | 06 | §8 |
| 08 | [Library editor](08-library-editor.md) | built | L | 02 | §12 |
| 09 | [Content fill](09-content-fill.md) | built | L | 04 | §9, §13 |
| 10 | [Printed worksheets](10-worksheets.md) | built | L | 05 | §16 |
| 11 | [The merged draw](11-merged-draw.md) | built | L | 04, 09 | §4, §5, §13 |
| 12 | [Forms: boxes, venn, chart, map](12-forms-boxes-venn-chart-map.md) | not started | L | 11 | §16, §13 |
| 13 | [Forms: pair, flow, grid, clocks](13-forms-pair-flow-grid-clocks.md) | not started | L | 12 | §16, §13 |
| 14 | [Forms: fields, recipe, retirements](14-forms-fields-recipe-retirements.md) | not started | L | 13 | §16, §13 |
| 15 | [Prompts: deep time to government](15-prompts-deep-time-to-government.md) | not started | L | 14 | §13 |
| 16 | [Prompts: money, land, weather](16-prompts-money-land-weather.md) | not started | M | 15 | §13 |
| 17 | [Prompts: people and daily life](17-prompts-people-and-daily-life.md) | not started | L | 16 | §13 |
| 18 | [Prompts: school, names, belief](18-prompts-school-names-belief.md) | not started | L | 17 | §13 |
| 19 | [Prompts: craft, food, voices](19-prompts-craft-food-voices.md) | not started | L | 18 | §13, §16 |
| 20 | [The twelve owed](20-the-twelve-owed.md) | not started | M | 19 | §13 |
| 21 | [The affinities](21-affinities.md) | not started | S | 11 | §9 |

Statuses: `not started` · `in progress` · `built`.

**Slice 06 was the ship point and slice 07 is the family screen on top of it: the
app does the whole nine-month job for one person on one phone, and the kitchen
tablet shows all three.** Slice 08 made the library tunable from a browser,
slice 09 filled it, and slice 10 turned a drawn month into the pages that go in
the binder.

**Slice 09 had the most leverage on how the app feels.** The library is 91
templates, all six project types carry a week-4 sequence, and
`003_country_data.sql` puts 222 hooks and 200 affinities on 100 countries.
Setup's three content-dependent features — the hook line on a country card, the
recommended focuses with their reason lines, and "Deal me three" — were built
inert in slice 04 and came alive with no client change. Its one open question,
Q-11, is answered: week 4's present task needs no audience beyond whoever is
home.

**Slice 10 is the binder, and it landed with its schema in two files rather than
one.** `004_worksheets.sql` is the migration — the table and the two nullable
columns — and `005_worksheet_layouts.sql` is the seed carrying the twelve
layouts and a binding for every week 1–3 template. They cannot be one file:
SQLite has no `ADD COLUMN IF NOT EXISTS`, so DDL cannot sit in a file Run seed
re-executes, and layouts that sit in a migration can never be corrected without
reading as drift. It also carries the worksheet layout editor, the one tab slice
08 could not build.

**Q-12 is answered — anyone prints, from any device — and the buttons then went
where the sheets break rather than where the device is.** **Print week** sits
beside each week's heading on Plan, and there is no month-wide button: printing
all four weeks the day the month is drawn puts weeks 2 and 3 on paper a swap
away from being wrong, and reprinting the month to fix one week reprints two
that nothing changed.

Slice 03 is built except for its fonts. D-10 is still outstanding, so the shell
runs on a system stack; swapping in the real faces is an `@font-face` pair and
two token values, plus a re-tune of the type scale. Two places show the missing
condensed grotesque most: the stamp's grid face, where a country name is set to
fit ninety pixels on a system sans, and the wall's own column heading, which is a
country name at forty pixels on a tablet and is the one thing in the app the
display face was chosen for.

**D-14 is the other outstanding due-out and it blocks nothing in code.** The wall
runs feature-detected on any tablet; what is unresolved is whether the owner has
to set display sleep and Guided Access by hand, which depends on a device nobody
has named.

**Slice 11 built the engine and slices 12–20 write the content it was measured against.**
`LIBRARY_v3.md` specifies both: a draw over one merged pool of 153 tagged prompts, and the
167 prompts that pool is made of. **Slice 11 is built**: the engine draws eight from one
pool against tag weights, deals them four and four, and joins the two pinned tasks, and it
is proved against a synthetic pool of the right shape. Sixty-one prompts are seeded, so the
app draws correctly from a pool a third of the intended size — with one number to watch,
the five-month cooldown, which is sized for 153 and exhausts by month six against the 49
that are drawable today.

**Erase everything changed what a schema slice costs, and slice 11 is what spent it.**
Every table can be dropped from `/admin` and rebuilt from the files, so `001_schema.sql`
is edited in place rather than appended to and `002_seed.sql` is rewritten rather than
grown. `task_focus_weights` was deleted outright rather than kept in parallel, and the
tier CHECK gained a value SQLite will not ALTER into one. There is no data in this
database worth protecting from a migration — which is also why slices 12–14 edit
`004_worksheets.sql`'s `kind` CHECK and `005_worksheet_layouts.sql`'s twelve rows in place
rather than writing a migration to correct them.

---

## How slices 12–21 divide the library

The old slice 12 was one XL file. It is now ten, and the seams are the ones it named:
forms, then prompts, then the writing, then the affinities.

**Forms lead prompts, always.** `worksheet_layouts.kind` is a CHECK and a binding points
at a layout row, so a prompt cannot be seeded before its form exists. That is the one
forced ordering in the whole split. Everything else is free.

**Slices 12–14 are the nineteen forms and the ten renderers**, grouped the way
`LIBRARY_v3.md` §6 orders them: the four that move the most prompts off a shape that
fights them, then the four that show sequence, cause, quantity and time, then the
retirements and the two that change what a month is. Forty-six of the sixty-one seeded
prompts are rebound across the three, so each one ends at a printed sheet that is visibly
better than the one before it.

**Slices 15–19 are the 106 prompts**, in batches of twelve to twenty-seven. The boundaries
are `LIBRARY_v3.md` §2's own subject headings — already ordered by subject, already sized
right, and findable again without a note. A prompt and its tags land in the same edit,
always: an untagged prompt draws at baseline forever and nothing in the app reports it.

**Slice 19 owns the numbers.** Everything §3 claims — the nine-month run, the paper table,
the form caps, the fallback that never fires — needs 153 drawable prompts, and slice 19 is
the first slice at which they exist.

**Slice 20 is the only writing.** Six week-3-flavoured prompts each for Ancient World and
Conflict and Change, which are at twelve and ten on-theme prompts where every other focus
is at seventeen or better. It comes after the measurement, so it is written against a
number rather than a guess.

**Slice 21 is D-15 and depends on nothing.** Sixty affinity rows for the three focuses
that have none. It sits last because it is blocked on the owner; it can be taken the day
the rows exist.

**A partial library is a working library, and that is what makes this splittable at all.**
The draw does not care how big the pool is: 61 prompts draws a month, 100 draws a better
one, 167 draws the one that was measured. Nothing breaks at an intermediate size and no
screen shows a gap. The one number that degrades quietly is the cooldown, so **every slice
in 12–20 reports the drawable count it ended at**:

| After slice | Drawable |
|---|---|
| 11 (today) | 49 |
| 12 | 50 |
| 13 | 52 |
| 14 | 52 |
| 15 | 74 |
| 16 | 93 |
| 17 | 114 |
| 18 | 141 |
| 19 | **153** |
| 20 | 165 |

**Three forms have no seeded prompt to bind**, so three prompts land early with them:
`what-work-pays` with `bar-graph` in slice 12, `who-lives-there` with `hundred-people` and
`how-they-learn` with `bullets` in slice 13. A form and the first prompt bound to it are
one thing, or nothing exercises the renderer. The batches that own those three subject
headings skip those rows.

**Three questions are open and each is asked in the slice whose code depends on it.**
Whether `storyboard` gains a CAPTION knob and whether *who published this* becomes a
stretch line: slice 14, because both are renderer changes. Whether `emblems` exists at
all: slice 15, which is the first slice writing at that end of the tag vocabulary.
`civic-process` was a fourth and slice 11 settled it — the tag stays, the weight goes.

---

## Why this order

The deploy-and-migrate path is built before anything that needs migrating, and
the end-to-end loop ran on a thin library before the library was written. Ninety
task prompts written ahead of a working draw are ninety prompts tuned against a
guess (§14) — and the ones written afterwards were tuned against a draw that
could be run nine months deep to see what came out.

Slices 00–03 are infrastructure and produce nothing a kid can see. That is
correct and worth stating so it doesn't read as slow progress: the project's
hard constraint is browser-only migration (§3), and it is cheapest to satisfy
before there is data to lose.

**Ship point: end of slice 06, and it is built.** The app does the whole
nine-month job for one person on one phone. Slice 07 added the family screen on
top of it, slice 08 the parent's editor, slice 09 the content that decides
whether the app is good rather than merely working, and slice 10 the binder.

**Slice 10 measures its thirds against the same paper the passport uses.** Slice
06 prints the passport against `--page-margin` and `--page-height` in
`public/css/app.css` (D-13); `public/css/print.css` declares the same two, plus
`--band` for the header, and a third is a third of what is left under it. The
two files have to agree, and a printer with a wider unprintable margin moves
`--page-margin` in both.

---

## Design section coverage

Every section of `DESIGN.md` and the slice that finishes it.

| Design section | Finished by |
|---|---|
| §1 Scope | — (scope statement, nothing to build) |
| §2 Stack | 03 — built but for the fonts (D-10) |
| §3 Migrations | 02 — built |
| §4 The task model | 11 — built |
| §5 Schema | 11 — built |
| §6 API | 11 — built |
| §7 This week | 05 — built |
| §7 Month setup | 04 — built |
| §7 Passport | 06 — built |
| §7 Plan | 05 — built |
| §8 The wall tablet | 07 — built |
| §9 Country data | 09 — built; 21 — the three new focuses' affinities (D-15) |
| §10 Progress | 05 — built |
| §11 Design direction | 07 — built but for the fonts (D-10) |
| §12 Library editor | 11 — built |
| §13 Seed data | 11 — nine focuses and their tags; 15–19 — the 106 prompts; 20 — the twelve owed |
| §14 Build order | — (superseded by this index) |
| §15 Decisions | — (tracked in ../other/OPEN-QUESTIONS.md) |
| §16 Printed worksheets | 10 — built; 12–14 — the nineteen forms and ten renderers; 19 — the paper numbers |
