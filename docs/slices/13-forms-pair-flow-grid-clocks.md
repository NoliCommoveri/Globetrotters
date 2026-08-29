# Slice 13 — Forms: pair, flow, grid, clocks

**Status:** not started
**Band:** L
**Implements:** §16 (eight of the nineteen forms), §13 (the bindings they take)
**Depends on:** 12

**Goal.** The second group in `LIBRARY_v3.md` §6's order: the four renderers that show
sequence, cause, quantity as icons, and time. Plus the three list forms, which cost no new
renderer and only knobs on `checklist`.

---

## What it is, in numbers

| | Count |
|---|---|
| New renderer kinds | 4 — `pair`, `flow`, `grid`, `clocks` |
| Knobs added to `checklist` | MARKER, CIRCLE_ONE, ORIENT, CAPTION |
| New `worksheet_layouts` rows | 8 |
| Seeded prompts rebound | 10 |
| …of which need rewritten prompt text | 9 |
| Prompts seeded early, with their tags | 2 |
| Drawable prompts at the end | 52 |

**The forms.**

| Form | Kind | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `then-now` | `pair` | 2 | `{"captions":["Before","After"],"lines_each":2,"middle":""}` | CAPTIONS, LINES_EACH, MIDDLE |
| `flow-steps` | `flow` | 1 | `{"steps":4,"orient":"across","caption":""}` | STEPS, ORIENT, CAPTION |
| `hundred-people` | `grid` | 2 | `{"rows":10,"per_row":10,"key_rows":4,"caption":"If this country were 100 people"}` | ROWS, PER_ROW, KEY_ROWS, KEY, CAPTION, LABEL_LINES |
| `pictograph` | `grid` | 1 | `{"rows":2,"per_row":10,"key":"Each figure =","label_lines":true}` | ” |
| `clock-pair` | `clocks` | 1 | `{"faces":2,"captions":["Their clock","Our clock"],"digital_line":true,"lines":2}` | FACES, CAPTIONS, DIGITAL_LINE, LINES |
| `list-n` | `checklist` | 1 | `{"items":5,"marker":"number","circle_one":false}` | ITEMS, LABELS, MARKER, CIRCLE_ONE, ORIENT, CAPTION |
| `bullets` | `checklist` | 1 | `{"items":5,"marker":"bullet","circle_one":false}` | ” |
| `week-strip` | `checklist` | 1 | `{"labels":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"marker":"box","orient":"across","caption":""}` | ” |

Two of the four knobs `LIBRARY_v3.md` §6 names land here: MARKER `bullet` in the
`checklist` branch, and MIDDLE on `pair` — a captioned write-in line drawn on the arrow,
skipped when the string is empty. LINES on `clocks` is the rule `lines` already uses.
`checklist` also gains CIRCLE_ONE, ORIENT and CAPTION, which §6's count missed and
`list-n` and `week-strip` both need.

**The ten rebindings.** Nine of the ten also need their prompt text replaced from §2 —
`game-kids-play` is the one whose words are already right. Binding, spec and text are one
edit, for the reason slice 12 gives:

| Form | Seeded prompts |
|---|---|
| `then-now` | `border-that-moved` `independence-day` `desert-shall-blossom` |
| `flow-steps` | `who-leads` `made-here` |
| `pictograph` | `city-and-country` |
| `clock-pair` | `time-there-now` |
| `list-n` | `neighbors-list` `game-kids-play` |
| `week-strip` | `their-rest-day` |

**`hundred-people` and `bullets` have no seeded prompt, so each seeds one.**
`who-lives-there` and `how-they-learn`, both from §2 *Who the people are*, land here with
their tags. Slice 17 owns that subject heading and skips those two rows.

## Due-outs

None.

## Open questions

None. See slices 14 and 15.

## Build

1. Four `KINDS` entries and four `RENDER` branches; `checklist`'s entry gains four knobs
   and its branch the markers and the across orientation.
2. A CSS block each in `public/css/print.css`.
3. Eight layout rows into `005_worksheet_layouts.sql`; `004_worksheets.sql`'s `kind` CHECK
   gains `pair`, `flow`, `grid`, `clocks`. Rebuild through **Erase everything · Apply
   pending · Run seed**.
4. Measure every height against real paper.
5. Rebind the ten: binding, spec and §2 prompt text together. `their-rest-day` absorbs
   the first-day-of-the-week question here (§5) and is one of the nine, not an extra.
6. `who-lives-there` and `how-they-learn`, with bindings, specs and tags.

**Three rules ride with these forms.**

- The `grid` key and the row length multiply to the whole. All six `pictograph` bindings
  set the key to ten per figure, and a `pictograph` prompt asks for exactly two numbers.
- `week-strip` is held to two bindings, ever.
- No two `flow-steps` bindings share an opening sentence (§4 rule 3). Two land here and
  five more in the prompt slices; the rule is checked against the whole form, not the
  batch.

## Exit criteria

- All eight forms print at their claimed heights, measured on paper.
- `time-there-now` prints two clock faces with a digits line rather than four ruled lines;
  `city-and-country` prints two rows of ten figures rather than a two-column compare.
- A `bullets` sheet prints n blank bullets and nothing else — no caption deciding the
  finding for the kid.
- MIDDLE prints on `border-that-moved` and `independence-day` and prints nothing on
  `desert-shall-blossom`.
- `test/worksheet.test.js` covers the four new kinds and `checklist`'s new knobs.
- Drawable count reported: 52.

## Do not build

`fields`, `recipe-card`, `box-note`, `label-small`, `differences`, `figure-anchor` — slice
14. The three retirements — slice 14, because prompts still bound to `box-caption`,
`compare` and `figures` do not all move until then.
