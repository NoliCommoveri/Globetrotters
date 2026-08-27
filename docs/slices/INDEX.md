# Slice index

Eleven slices against `../design/DESIGN.md`. Each ends at a state you can open
in a browser and judge.

A build session takes the first slice not marked `built` and reads its file.
Slices are strictly ordered — the dependency column is why, not a suggestion.

| # | Slice | Status | Band | Depends on | Design sections |
|---|---|---|---|---|---|
| 00 | [Deploy path](00-deploy-path.md) | built | M | — | §2, §3 (deploy half) |
| 01 | [Migration runner](01-migration-runner.md) | built | M | 00 | §3, §5 |
| 02 | [Seed v0 and catalog](02-seed-and-catalog.md) | built | M | 01 | §13 (partial), §6 (catalog) |
| 03 | [Auth and shell](03-auth-and-shell.md) | built | M | 02 | §2 (auth), §11 |
| 04 | [Setup, draw, reveal](04-setup-draw-reveal.md) | built | L | 03 | §4, §7 Month setup |
| 05 | [This week](05-this-week.md) | built | L | 04 | §7 This week, §7 Plan, §10 |
| 06 | [Completion and passport](06-completion-and-passport.md) | not started | M | 05 | §7 Passport |
| 07 | [The wall](07-wall.md) | not started | M | 06 | §8 |
| 08 | [Library editor](08-library-editor.md) | not started | L | 02 | §12 |
| 09 | [Content fill](09-content-fill.md) | not started | L | 04 | §9, §13 |
| 10 | [Printed worksheets](10-worksheets.md) | not started | L | 05 | §16 |

Statuses: `not started` · `in progress` · `built`.

Slice 06 is next. No open question blocks it, and its one due-out — D-13, the
paper size the passport prints to — blocks the print stylesheet and nothing
else, so the screen and the stamp can be built before it lands. Slice 04 built
`GET /api/passport` whole (Q-07), so 06 inherits the endpoint and builds the
screen, the completion offer at 20/20 and the stamp.

The pool the stamp headline is picked from is already filling: slice 05's
"What surprised you?" writes `sessions.note`, and the plan payload carries them
as `notes`.

Setup's three content-dependent features — the hook line on a country card, the
recommended focuses with their reason lines, and "Deal me three" — are built and
inert: `002_seed.sql` carries no hooks and no affinities. They come alive when
slice 09 lands `003_country_data.sql`, with no client change.

Slice 03 is built except for its fonts. D-10 is still outstanding, so the shell
runs on a system stack; swapping in the real faces is an `@font-face` pair and
two token values, plus a re-tune of the type scale.

---

## Why this order

The deploy-and-migrate path is built before anything that needs migrating, and
the end-to-end loop runs on a thin library before the library is written.
Ninety task prompts written ahead of a working draw are ninety prompts tuned
against a guess (§14).

Slices 00–03 are infrastructure and produce nothing a kid can see. That is
correct and worth stating so it doesn't read as slow progress: the project's
hard constraint is browser-only migration (§3), and it is cheapest to satisfy
before there is data to lose.

**Ship point: end of slice 06.** At that point the app does the whole
nine-month job for one person on one phone. Slices 07–09 are the family
experience and the quality of the work; none of them block September.

Slices 08, 09 and 10 depend on earlier slices but not on each other or on 07.
They can run in any order once their dependency is met.

**Slice 10 is the binder.** It turns a drawn month into printed pages (§16), and
it is the one late slice with a hard date on it: pages are worth having in
September, not in March. Its dependency is slice 05 and nothing more — the
layout bindings that make the pages good are content and ride along with slice
09, and until they exist every task prints its prompt over ruled lines, which is
already better than a blank sheet of looseleaf. That means 10 can run before 09
without losing anything, and 09 improves it afterwards with no code change.

Its one open question, **Q-12**, blocks where the print button goes and not the
route or the layouts, so most of the slice can be built before it is answered.

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
| §6 API | 10 (last route lands there) |
| §7 This week | 05 — built |
| §7 Month setup | 04 — built |
| §7 Passport | 06 |
| §7 Plan | 05 — built |
| §8 The wall tablet | 07 |
| §9 Country data | 09 |
| §10 Progress | 05 — built |
| §11 Design direction | 06 (the stamp is the last piece) |
| §12 Library editor | 08 |
| §13 Seed data | 09 (10 adds the layout seed) |
| §14 Build order | — (superseded by this index) |
| §15 Decisions | — (tracked in ../other/OPEN-QUESTIONS.md) |
| §16 Printed worksheets | 10 |
