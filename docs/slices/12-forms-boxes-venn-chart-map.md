# Slice 12 — Forms: boxes, venn, chart, map

**Status:** not started
**Band:** L
**Implements:** §16 (five of the nineteen forms), §13 (the bindings they take)
**Depends on:** 11

**Goal.** The four renderers `LIBRARY_v3.md` §6 puts first, because they move the most
prompts off a shape that fights them. Ten already-seeded prompts stop printing on
`table-3`, `box-beside` and `figures` and start printing on the form they were written
for.

---

## What it is, in numbers

| | Count |
|---|---|
| New renderer kinds | 4 — `boxes`, `venn`, `chart`, `map` |
| New `worksheet_layouts` rows | 5 |
| Seeded prompts rebound | 10 |
| Prompts seeded early, with their tags | 1 |
| Drawable prompts at the end | 50, from 49 |

**The forms.**

| Form | Kind | Thirds | Spec | `LIBRARY_v3.md` §1 |
|---|---|---|---|---|
| `specimen-boxes` | `boxes` | 2 | `{"boxes":4,"caption":"","label_lines":1,"circle_one":false}` | *Several boxes, each labelled* |
| `venn` | `venn` | 2 | `{"labels":["There","Here"],"shared":"Both","lines_each":3}` | *The overlap* |
| `bar-graph` | `chart` | 2 | `{"mode":"bars","bars":5,"orient":"vertical","scale_marks":5,"axis_label":"","caption":""}` | *Numbers* |
| `scale-strip` | `chart` | 1 | `{"mode":"scale","orient":"vertical","marks":2,"unit":"","captions":["",""]}` | *Numbers* |
| `map-marks` | `map` | 2 | `{"caption":"","pins":5}` | *The country itself* |

`bar-graph` and `scale-strip` are one renderer with a MODE knob and two heights.

**The ten rebindings**, each with the per-template spec its §2 entry declares:

| Form | Seeded prompts |
|---|---|
| `specimen-boxes` | `under-the-ground` `tree-that-grows` `craft-of-the-land` `market-day` |
| `venn` | `breakfast-there` `animals-on-the-menu` |
| `scale-strip` | `highest-point` `weather-there-now` |
| `map-marks` | `map-outline` `river-that-matters` |

**`bar-graph` has no seeded prompt, so it seeds one.** A form nothing binds to is a
renderer nothing exercises. `what-work-pays` — a `bar-graph` prompt from `LIBRARY_v3.md`
§2 *Money, work, and who is actually paid* — lands here with its two topic tags and its
one mode tag. Slice 16 owns that subject heading and skips this one row.

## Due-outs

None. D-15 belongs to slice 21 and blocks nothing here.

## Open questions

None. The three open against the library are answered in slices 14 and 15, against the
code that depends on them.

## Build

1. **Four `KINDS` entries** in `src/lib/worksheet.js` — every knob the form has and no
   other, because a key not named there does not reach a page.
2. **Four `RENDER` branches**, and a CSS block each in `public/css/print.css`.
3. **Five layout rows** into `005_worksheet_layouts.sql`. `004_worksheets.sql`'s `kind`
   CHECK gains `boxes`, `venn`, `chart`, `map` — an edit in place, with **Erase
   everything · Apply pending · Run seed** to rebuild (`DESIGN.md` §3).
4. **Measure each height against real paper** before the row is trusted.
5. **Rebind the ten**, and set each one's spec from its §2 entry.
6. **`what-work-pays`**, its binding, its spec, its tags.

**Heights are measured, never guessed.** A layout row whose height was guessed is worse
than no layout row, because the packer believes it. `LIBRARY_v3.md` §3's paper table is
only true if the heights are.

**Two rules ride with these forms.** `PINS` on `map-marks` is never 1, and every pin is a
place inside the country or on its edge (§4 rule 6). The key and the row length on the
`chart` scale have to multiply to the whole.

## Exit criteria

- Every one of the five forms prints at the height its layout row claims, measured on
  paper.
- A month drawn for a learner prints with at least one of the five on it, and no sheet
  overflows.
- `map-outline` prints a traced country with three numbered pins rather than a captioned
  box; `highest-point` prints one vertical scale at three marks rather than three number
  boxes.
- `test/worksheet.test.js` covers the four new kinds' spec readers, including a spec key
  the kind does not have.
- Drawable count reported: 50.

## Do not build

The other fourteen forms. The 105 prompts. `figures` stays as it is until slice 14
rewrites it — `how-many-people` and `size-next-to-yours` keep printing wrong for two more
slices, and that is cheaper than half-rewriting a renderer here.
