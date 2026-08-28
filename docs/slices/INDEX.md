# Slice index

Eleven slices against `../design/DESIGN.md`. Each ends at a state you can open
in a browser and judge.

A build session takes the first slice not marked `built` and reads its file. The
dependency column is what actually orders them, not the numbering: 00–09 are
built, and slice 10 is what remains.

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
| 10 | [Printed worksheets](10-worksheets.md) | not started | L | 05 | §16 |

Statuses: `not started` · `in progress` · `built`.

**Slice 06 was the ship point and slice 07 is the family screen on top of it: the
app does the whole nine-month job for one person on one phone, and the kitchen
tablet shows all three.** Slice 08 made the library tunable from a browser and
slice 09 filled it. What is left is the binder.

**Slice 09 had the most leverage on how the app feels, and it has landed.** The
library is 90 templates, all six project types carry a week-4 sequence, and
`003_country_data.sql` puts 222 hooks and 200 affinities on 100 countries.
Setup's three content-dependent features — the hook line on a country card, the
recommended focuses with their reason lines, and "Deal me three" — were built
inert in slice 04 and came alive with no client change. Its one open question,
Q-11, is answered: week 4's present task needs no audience beyond whoever is
home.

**Slice 10 is all that remains, and it has a date on it in a way nothing else
did** — printed pages are worth having in September, not in March. Its Q-12
stops only where the print button goes, so most of it can be built before that
is answered. It also carries the worksheet layout editor: slice 08 built the
rest of `/admin/library` and could not build that one tab, because
`worksheet_layouts` does not exist until `004_worksheets.sql`.

**The worksheet bindings are slice 10's now, and that is a change from the
plan.** They were meant to ride along with the templates in 09, but the column
they live in does not exist until 10 applies it, so 10 writes the column and the
bindings together. Nothing is lost: an unbound task prints its prompt over ruled
lines, which is already better than blank looseleaf.

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
top of it, slice 08 the parent's editor, and slice 09 the content that decides
whether the app is good rather than merely working. Slice 10 is the binder, and
it does not block September either.

**Slice 10 is the binder.** It turns a drawn month into printed pages (§16), and
it is the one late slice with a hard date on it: pages are worth having in
September, not in March. Its dependency is slice 05 and nothing more. It writes
the layout bindings itself, in the same file that adds the column they live in;
until a task has one it prints its prompt over ruled lines, which is already
better than a blank sheet of looseleaf.

Its one open question, **Q-12**, blocks where the print button goes and not the
route or the layouts, so most of the slice can be built before it is answered.

The two page numbers it measures thirds against are already declared and in use:
slice 06 prints the passport against `--page-margin` and `--page-height` in
`public/css/app.css` (D-13), and slice 10 reads the same two.

---

## Design section coverage

Every section of `DESIGN.md` and the slice that finishes it.

| Design section | Finished by |
|---|---|
| §1 Scope | — (scope statement, nothing to build) |
| §2 Stack | 03 — built but for the fonts (D-10) |
| §3 Migrations | 02 — built |
| §4 The task model | 04 — built |
| §5 Schema | 10 (the worksheet tables are the last of it) |
| §6 API | 10 (the print route and the two layout routes; slice 08 landed the rest of the editor's) |
| §7 This week | 05 — built |
| §7 Month setup | 04 — built |
| §7 Passport | 06 — built |
| §7 Plan | 05 — built |
| §8 The wall tablet | 07 — built |
| §9 Country data | 09 — built |
| §10 Progress | 05 — built |
| §11 Design direction | 07 — built but for the fonts (D-10) |
| §12 Library editor | 10 — 08 built all of it but the layout editor |
| §13 Seed data | 10 — 09 filled the library; 10 adds the layout seed and the bindings |
| §14 Build order | — (superseded by this index) |
| §15 Decisions | — (tracked in ../other/OPEN-QUESTIONS.md) |
| §16 Printed worksheets | 10 |
