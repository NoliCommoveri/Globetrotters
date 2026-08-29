# Slice index

Thirteen slices against `../design/DESIGN.md`. Each ends at a state you can open
in a browser and judge.

A build session takes the first slice not marked `built` and reads its file.
**Slices 00–11 are built.** Slice 12 is the only one left: the library the draw engine was
measured against — 106 prompts, 19 forms and 10 renderers — and it is XL, so it is split
before it is started rather than after. Also outstanding are due-outs D-10, D-14 and D-15,
none of them code.

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
| 12 | [The library](12-the-library.md) | not started | XL — split it | 11 | §9, §13, §16 |

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

**Slices 11 and 12 are one design landed as two, and the split is the engine from the
content.** `LIBRARY_v3.md` specifies both: a draw over one merged pool of 153 tagged
prompts, and the 167 prompts that pool is made of. **Slice 11 is built**: the engine draws
eight from one pool against tag weights, deals them four and four, and joins the two pinned
tasks, and it is proved against a synthetic pool of the right shape. Sixty-one prompts are
seeded, so the app draws correctly from a pool a third of the intended size — with one
number to watch, the five-month cooldown, which is sized for 153 and exhausts by month six
against the 49 that are drawable today. Slice 12 writes the rest of the library and is the
only thing that can prove the numbers `LIBRARY_v3.md` §3 reports.

**Erase everything changed what a schema slice costs, and slice 11 is what spent it.**
Every table can be dropped from `/admin` and rebuilt from the files, so `001_schema.sql`
is edited in place rather than appended to and `002_seed.sql` is rewritten rather than
grown. `task_focus_weights` was deleted outright rather than kept in parallel, and the
tier CHECK gained a value SQLite will not ALTER into one. There is no data in this
database worth protecting from a migration.

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
| §9 Country data | 09 — built; 12 — the three new focuses' affinities (D-15) |
| §10 Progress | 05 — built |
| §11 Design direction | 07 — built but for the fonts (D-10) |
| §12 Library editor | 11 — built |
| §13 Seed data | 11 — nine focuses and their tags; 12 — the 106 prompts |
| §14 Build order | — (superseded by this index) |
| §15 Decisions | — (tracked in ../other/OPEN-QUESTIONS.md) |
| §16 Printed worksheets | 10 — built; 12 — the nineteen forms and ten renderers |
