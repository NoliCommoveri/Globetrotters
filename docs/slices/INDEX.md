# Slice index

Ten slices against `../design/DESIGN.md`. Each ends at a state you can open in
a browser and judge.

A build session takes the first slice not marked `built` and reads its file.
Slices are strictly ordered — the dependency column is why, not a suggestion.

| # | Slice | Status | Band | Depends on | Design sections |
|---|---|---|---|---|---|
| 00 | [Deploy path](00-deploy-path.md) | built | M | — | §2, §3 (deploy half) |
| 01 | [Migration runner](01-migration-runner.md) | not started | M | 00 | §3, §5 |
| 02 | [Seed v0 and catalog](02-seed-and-catalog.md) | not started | M | 01 | §13 (partial), §6 (catalog) |
| 03 | [Auth and shell](03-auth-and-shell.md) | not started | M | 02 | §2 (auth), §11 |
| 04 | [Setup, draw, reveal](04-setup-draw-reveal.md) | not started | L | 03 | §4, §7 Month setup |
| 05 | [This week](05-this-week.md) | not started | L | 04 | §7 This week, §7 Plan, §10 |
| 06 | [Completion and passport](06-completion-and-passport.md) | not started | M | 05 | §7 Passport |
| 07 | [The wall](07-wall.md) | not started | M | 06 | §8 |
| 08 | [Library editor](08-library-editor.md) | not started | L | 02 | §12 |
| 09 | [Content fill](09-content-fill.md) | not started | L | 04 | §9, §13 |

Statuses: `not started` · `in progress` · `built`.

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

Slices 08 and 09 depend on earlier slices but not on each other or on 07. They
can run in any order once their dependency is met.

---

## Design section coverage

Every section of `DESIGN.md` and the slice that finishes it.

| Design section | Finished by |
|---|---|
| §1 Scope | — (scope statement, nothing to build) |
| §2 Stack | 03 |
| §3 Migrations | 01 |
| §4 The task model | 04 |
| §5 Schema | 01 |
| §6 API | 07 (last endpoint lands there) |
| §7 This week | 05 |
| §7 Month setup | 04 |
| §7 Passport | 06 |
| §7 Plan | 05 |
| §8 The wall tablet | 07 |
| §9 Country data | 09 |
| §10 Progress | 05 |
| §11 Design direction | 06 (the stamp is the last piece) |
| §12 Library editor | 08 |
| §13 Seed data | 09 |
| §14 Build order | — (superseded by this index) |
| §15 Decisions | — (tracked in ../other/OPEN-QUESTIONS.md) |
