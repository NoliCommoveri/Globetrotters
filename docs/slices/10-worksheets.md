# Slice 10 — Printed worksheets

**Status:** built
**Band:** L
**Implements:** §16
**Depends on:** 05

**Goal.** A drawn month comes out of the printer as the pages that go in the
binder, ruled and titled, so none of the ten minutes goes into laying out a
page.

---

## Due-outs

- **D-13** Paper. Answered: **US Letter**, 0.5in margins, a 7.5 × 10in printable
  area. That is where a segment's third comes from, and it is two CSS variables
  so a printer with a wider unprintable margin is a one-line change.

Nothing else. Everything this slice reads exists after slice 05.

## Open questions

- **Q-12** — Answered: **anyone, from any device.** The printer is reachable
  from the kids' phones, so the button is real wherever it sits. The household
  fact settled; where the button went was then decided by the sheets rather than
  by the device — see The buttons.

## Build

### The migration and the seed

Two files, because they are protected by opposite rules (§3).

`004_worksheets.sql` is the migration: `worksheet_layouts`, plus
`worksheet_layout_id` and `worksheet_spec` on `task_templates` (§5). Both columns
are nullable and stay that way. Checksummed, applied once, never edited.

`005_worksheet_layouts.sql` is the seed: the twelve layout rows, upserted on
`slug` on every **Run seed** like every other seeded row, and the binding for
every week 1–3 template, written only where the column is still empty.

They cannot be one file. SQLite has no `ADD COLUMN IF NOT EXISTS`, so a file
carrying the two `ALTER TABLE`s fails its second Run seed and halts the press —
and layouts that live in a migration can never be corrected or added to without
reading as drift forever. The split is what the machinery leaves, and it is also
the right shape: the DDL is written once and the content keeps growing.

### The twelve layouts

Each declares a `kind`, a height in thirds, and a JSON `spec` of named knobs.
Heights are the thing to get right first: they are what the packer arithmetic
runs on, and a layout that overflows its declared height pushes the next segment
off the sheet.

| slug | kind | thirds | knobs | for |
|---|---|---|---|---|
| `lines-4` | lines | 1 | `lines` | short written answers |
| `lines-8` | lines | 2 | `lines` | the default when a task wants room |
| `box-caption` | box | 2 | `caption` | flag, map, an animal drawn |
| `box-beside` | box | 1 | `caption`, `lines` | a small sketch with notes next to it |
| `split-two` | split | 1 | `columns[2]` | their word / how it sounds |
| `compare` | split | 2 | `columns[2]`, `rows` | there / here |
| `table-3` | table | 2 | `columns[3]`, `rows` | anything with three facts a row |
| `timeline` | timeline | 1 | `ticks` | five dates on a line |
| `figures` | figures | 1 | `boxes`, `captions[]` | population, area, a number to find |
| `label-it` | box | 3 | `caption`, `callouts` | one big sketch with callout lines |
| `checklist` | checklist | 1 | `items` | week 4 materials |
| `storyboard` | storyboard | 2 | `panels` | week 4 planning |

A template with no binding renders as its prompt over eight ruled lines **in one
third** — a built-in fallback, not a row. One third rather than `lines-8`'s two
is what holds an unbound month to seven sheets; a two-third default would print
sixteen.

### The renderer

- **Named keys only.** Each `kind` has a fixed renderer that reads the keys it
  knows and escapes every string. Nothing from the database is written as
  markup, ever — the library editor (§12) puts a form in front of these fields
  and the printed page must not be reachable from it as an injection surface.
- **Per-template overrides.** `task_templates.worksheet_spec` is merged over the
  layout's `spec`, key by key, and unknown keys are dropped rather than passed
  through.
- **A segment is** its `workbook_page` label, its title, its prompt in full, and
  the layout under it.

### The packer

- Segments in `plan_tasks.position` order, never reordered.
- Place into the current sheet while `remaining_thirds >= height_thirds`,
  otherwise start a new sheet.
- **Each week starts a new sheet.** Weeks 1–3 are five tasks each, usually two
  sheets. Week 4 is exactly one sheet: the project type's `materials` as a
  checklist, its five steps as check-off lines, and a storyboard. Four of week
  4's five tasks get no segment at all (§16).
- A month is about seven sheets.

### The route and the page

- `GET /print/:planId` — a Worker-rendered document, family cookie required, the
  wall's cookie refused. Not under `/api/`. It joins `plan_tasks` →
  `task_templates` → `worksheet_layouts` in one query and renders.
- `?week=N` renders one week, and it is what every button in the app asks for.
- Its own stylesheet: `@page { size: letter; margin: 0.5in }`,
  `page-break-inside: avoid` on every segment, ink on white. It shares nothing
  with `public/css/app.css` but the type scale.
- Header band per sheet: person, country, month, week, *sheet n of m*, ruled in
  that person's ink. **n of m counts within the week** in both the whole-month
  and the `?week=N` render, so a reprinted week is the same sheets it was.
- A sticky **Print** button on the document itself, hidden on paper, calling
  `window.print()`. The browser's own print entry is inside a share sheet on a
  phone and absent from the menu on some Android builds.

### The buttons

- **Print week ↗** beside every week's heading on **Plan**, opening
  `/print/:planId?week=N` in a new tab. There is no month-wide button: printing
  four weeks the day the month is drawn puts weeks 2 and 3 on paper a swap away
  from being wrong.
- After a swap on Plan, the toast names the week to print again. One sheet or
  two, not seven.

**Q-12 is answered:** anyone prints, from any device but the wall.

### The layout editor

Slice 08 built the rest of `/admin/library` and left this to the slice that
creates the table (§12). It is a fifth tab on the page already there, rendering
from the same `GET /admin/api/library` payload as the other four.

- Name, kind, height in thirds, and that kind's own knobs, with the
  bound-template count beside each one. Editing a layout changes every task
  bound to it, which is the point of there being twelve rather than ninety.
- Every field is a named value the renderer reads and escapes. There is no
  markup field, because this form is the one place a typed string reaches a
  printed page.
- The task list gains one column: the layout each template's printed segment
  uses. `PATCH /admin/api/tasks/:id` takes `worksheet_layout_id` once the column
  exists.
- `POST /admin/api/layouts`, `PATCH /admin/api/layouts/:id`. Archived, never
  deleted, like everything else on that page but a country hook.

## Exit criteria

- A freshly drawn September prints, with no layout bound to any template, as
  about seven sheets of prompt-over-ruled-lines and nothing blank where a task
  should be
- Binding `box-caption` to the flag template changes that segment and nothing
  else on the sheet
- No segment is split across a page break, at any combination of heights
- Sheet counts are right: three 1-third segments fill a sheet, a 2-third
  followed by a 2-third does not
- Week 2 starts on a new sheet even when week 1 ends with a third to spare
- Week 4 is one sheet, and "rehearse it twice" has no segment on it
- `?week=3` prints exactly week 3's sheets, numbered *n of m* within the week
- A swap changes only the sheets of the week it happened in
- The three people's headers are legible and distinct printed in greyscale
- A layout `spec` containing `<script>` prints as visible text on the page
- A layout edited in `/admin/library` changes every task bound to it, and a
  `spec` typed there containing `<script>` prints as visible text on
  `/print/:planId`
- The wall's cookie gets a 401; a family cookie with no person still prints
- Printed at 100% on Letter, nothing clips

## Do not build

- **No PDF generation, no R2, no stored pages.** The browser's print dialog is
  the whole output path. A stored artifact needs a freeze the plan does not
  have (§16).
- **No `finalized_at`, and no lock on the plan.** Swap, redraw and change-focus
  keep working exactly as §4 specs them after a month has been printed.
- **No per-task print button.** `?week=N` covers the reprint case; a single task
  is a third of a page.
- **Not the layout editor.** It is in this slice's Build, not out of it: slice
  08 is built and could not carry it, because `worksheet_layouts` does not exist
  until `004_worksheets.sql` lands here.
- **No new task prompts, focuses or project types.** The library is slice 09's
  and it is full. The bindings — which of the twelve layouts each template wants
  — are this slice's, because the column they live in does not exist until
  `004_worksheets.sql` applies.
- **Nothing on `/wall`.** No print button, no print route, no exception.

## What it came to

All twelve layouts landed, so the split named here was not needed.

A drawn month is **seven to nine sheets** — exactly seven with nothing bound,
eight on average once the bindings are in, ten at the far end of a draw that
lands three drawing boxes in one week. §16's "about seven" is the unbound
number; the extra sheet or two is the room the bindings buy.
