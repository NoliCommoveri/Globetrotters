# Slice 14 — Forms: fields, and the box and split knobs

**Status:** built
**Band:** L
**Implements:** §16 (four forms, one retirement), §13 (nineteen prompts rewritten and rebound)
**Depends on:** 13

**Goal.** The most reachable shape in the library and the two knobs the surviving v2
renderers are missing. Nineteen seeded prompts move here — the largest group in the split
— and `box-caption` is retired, because this is the slice at which the last of its six
prompts leaves it.

---

## What it is, in numbers

| | Count |
|---|---|
| New renderer kinds | 1 — `fields` |
| Kinds gaining knobs | 2 — `box` (BELOW), `split` (SHARED) |
| New `worksheet_layouts` rows | 4 |
| Forms retired | 1 — `box-caption` |
| Seeded prompts rebound | 19 |
| …of which need rewritten prompt text | 17 |
| Drawable prompts at the end | 52, unchanged |

**The forms.**

| Form | Kind | Thirds | Spec |
|---|---|---|---|
| `fields` | `fields` | 1 | `{"captions":["","",""],"lines_each":1}` |
| `box-note` | `box` | 2 | `{"caption":"Draw it here","lines":2,"below":true,"callouts":0}` |
| `label-small` | `box` | 2 | `{"caption":"Draw it, then label the parts","lines":0,"callouts":3}` |
| `differences` | `split` | 1 | `{"columns":["There","Here"],"rows":3,"shared":1}` |

**The nineteen prompts**, each rebound *and* rewritten unless marked otherwise:

| Form | Seeded prompts |
|---|---|
| `fields` | `oldest-thing-here` `first-people` `what-they-grow` `weather-that-hits` `animal-in-trouble` `sabbath-keepers-there` `holiday-they-mark` `sound-of-the-country` |
| `box-note` | `national-symbol` *(text unchanged)* `ancient-site` `wild-animal` `wild-place-protected` `place-of-worship` *(text unchanged)* |
| `label-small` | `house-they-live-in` `what-they-wear` |
| `differences` | `law-you-notice` `who-can-vote` `girls-and-women` `the-sport-they-love` |

**The rewrite is why the rebind is correct, not a tidy-up beside it.** A form carries a
slot for every thing its prompt asks for and asks for every slot it carries (§1).
`law-you-notice` today asks for *one law* and would print onto three `differences` rows
and a *But the same* rule that nothing asked for; its §2 text asks for three laws, each
against how it works here, plus one rule that is the same in both places. Rebinding
without rewriting prints an empty form; rewriting without rebinding prints an answer with
nowhere to go. They are one edit.

**`box-caption` clears here.** Its six prompts are `map-outline` (to `map-marks`, slice
12) and the five above. The row comes out of `005_worksheet_layouts.sql` in this slice and
not before.

## Due-outs

None.

## Open questions

None. Slice 15 asks the two that remain.

## Build

1. One `KINDS` entry and one `RENDER` branch for `fields`; `below` added to `box`,
   `shared` added to `split`, and their branches taught to draw them.
2. A CSS block each in `public/css/print.css`.
3. Four layout rows into `005_worksheet_layouts.sql`, `box-caption` deleted from it, and
   `004_worksheets.sql`'s `kind` CHECK gains `fields`. Rebuild through **Erase everything ·
   Apply pending · Run seed**.
4. Measure the `fields` height against real paper.
5. For each of the nineteen: the binding, the spec from its §2 entry, and its §2 prompt
   text into `002_seed.sql`. All three in the same edit.

**Every `fields` binding sets CAPTIONS.** Shipped with the empty default the form becomes
the new ruled lines inside a month, which is the whole reason it is capped at twelve.

**Every binding that sets `shared: 1` asks for the shared row in its wording** (§4 rule 2).
Three v2 bindings printed a *But the same* rule under a prompt that never asked for it,
and two of the three are in this slice's list.

**No two `differences` bindings share a closing sentence** (§4 rule 3). Seven of nine once
ended in the identical fourteen words. Four of the nine land here and they are four
distinct closers, checked against the whole form.

## Exit criteria

- All four forms print at their claimed heights, measured on paper.
- Nothing is bound to `box-caption` and the row is gone.
- Every one of the nineteen prints a sheet whose slots the prompt actually asks for —
  read one `fields`, one `box-note`, one `label-small` and one `differences` sheet against
  its prompt and check it slot for slot.
- `fields` is at twelve bindings across the library and no more (§4 rule 1). Eight of the
  twelve land here.
- `test/worksheet.test.js` covers `fields` and the two new knobs.
- Drawable count reported: 52.

## Do not build

`figure-anchor`, `recipe-card`, the `timeline` knobs, the twelve text-only rewrites, or
the retirement of `compare` and `figures` — slice 15. Two of `compare`'s and `figures`'
prompts are still bound to them until that slice moves them.
