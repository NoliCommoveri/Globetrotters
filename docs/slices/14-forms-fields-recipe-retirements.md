# Slice 14 — Forms: fields, recipe, and the v2 retirements

**Status:** not started
**Band:** L
**Implements:** §16 (the last six forms, the three retirements), §13 (the bindings)
**Depends on:** 13

**Goal.** The reckoning with the twelve forms slice 10 seeded. Three of them are retired,
one is rewritten into a different form on the same renderer, three more gain the knobs
their v3 bindings need, and the last two new renderers land. At the end, every one of the
sixty-one seeded week 1–3 prompts prints on the form `LIBRARY_v3.md` §2 binds it to.

`recipe-card` and the pinned slots come last on purpose (§6): they change what a month is,
not just what a page looks like.

---

## What it is, in numbers

| | Count |
|---|---|
| New renderer kinds | 2 — `fields`, `recipe` |
| Renderer rewritten | 1 — `figures` |
| Kinds gaining knobs | 3 — `box` (BELOW), `split` (SHARED), `timeline` (UNIT, ENDS) |
| New `worksheet_layouts` rows | 6 |
| Forms retired | 3 — `box-caption`, `compare`, `figures` |
| Seeded prompts rebound | 26 |
| Drawable prompts at the end | 52, unchanged |

**The forms.**

| Form | Kind | Thirds | Spec |
|---|---|---|---|
| `fields` | `fields` | 1 | `{"captions":["","",""],"lines_each":1}` |
| `recipe-card` | `recipe` | 3 | `{"ingredients":10,"steps":6,"sketch":true}` |
| `box-note` | `box` | 2 | `{"caption":"Draw it here","lines":2,"below":true,"callouts":0}` |
| `label-small` | `box` | 2 | `{"caption":"Draw it, then label the parts","lines":0,"callouts":3}` |
| `differences` | `split` | 1 | `{"columns":["There","Here"],"rows":3,"shared":1}` |
| `figure-anchor` | `figures` | 1 | `{"caption":"","unit":"","anchor_prompt":"About the same as…"}` |

**`figures` is rewritten, not extended.** Today the branch prints three captioned number
boxes. `figure-anchor` is one large boxed number with its unit and a ruled line beneath,
and the anchor line is for something the kid already knows that is about the same size —
never a second unrelated fact. The old knobs go; the three prompts using them are rebound
in this slice, so nothing is left reading a key that no longer exists.

**The twenty-six rebindings.**

| Form | Seeded prompts |
|---|---|
| `fields` | `oldest-thing-here` `first-people` `what-they-grow` `weather-that-hits` `animal-in-trouble` `sabbath-keepers-there` `holiday-they-mark` `sound-of-the-country` |
| `box-note` | `national-symbol` `ancient-site` `wild-animal` `wild-place-protected` `place-of-worship` |
| `differences` | `law-you-notice` `who-can-vote` `girls-and-women` `the-sport-they-love` |
| `figure-anchor` | `how-many-people` `size-next-to-yours` `getting-around` |
| `label-small` | `house-they-live-in` `what-they-wear` |
| `table-3` | `what-people-believe` |
| `lines-8` | `feast-they-keep` |
| `box-beside` | `tonights-dinner` |
| `recipe-card` | `cook-it` |

**The three retirements clear here and only here.** `box-caption`'s six prompts split
across `map-marks` (slice 12) and `box-note` and `label-small` (this slice); `compare`'s
two across `pictograph` (slice 13) and `figure-anchor`; `figures`' three across
`scale-strip` (slice 12) and `figure-anchor`. Not until this slice is any of the three
free of bindings. `figures` survives as the *renderer* `figure-anchor` rides; the other
two carry no v3 binding at all.

**The §5 fixes on seeded prompts that stay on a v2 form** land here, because nothing else
touches those rows: `landmark-to-see` drops from four ruled lines to two;
`kingdom-over-this-place` and `feast-they-keep` ask for five or six lines against their
eight; `what-people-believe` drops the *roughly how many* column, takes *when it arrived
there*, and goes from four rows to three; the four seeded `differences` prompts take four
of the nine distinct closers; the four seeded `timeline` bindings get ENDS labels that
name no year (§4 rule 5).

## Due-outs

None.

## Open questions

Two, both raised in `LIBRARY_v3.md` §7, both asked here because the code that depends on
them is a renderer. One `AskUserQuestion` call each, one at a time.

1. **Does `storyboard` gain a CAPTION knob?** Three week-3 storyboards — a legend, a Bible
   account, a process — print as six identical panels without it. It would be the one new
   knob in v3. One of the three is seeded; the other two land in slices 18 and 19, so the
   answer has to exist before they do.
2. **Does *who published this, and what do they want you to think* become a stretch line
   on the six hardest prompts, or stay a footer?** The six are
   `the-group-that-gets-less`, `who-can-read`, `what-their-money-goes-to`,
   `is-the-law-kept`, `can-they-worship-freely`, `the-company-that-got-caught`, spread
   across slices 15, 16 and 17. **There is no stretch-line mechanism anywhere in the
   schema or the renderer today** — `LIBRARY_v3.md` carries exactly one *Stretch:* line,
   on `how-far-away-is-it`, and nothing prints it. So this question is really two: whether
   the six get the line, and whether a stretch line is a thing a prompt can have. If the
   answer is a line, this slice builds it; the batches then carry data and nothing more.

## Build

1. Two `KINDS` entries and two `RENDER` branches; `figures` rewritten; `below` on `box`,
   `shared` on `split`, `unit` and `ends` on `timeline`.
2. A CSS block each in `public/css/print.css`.
3. Six layout rows into `005_worksheet_layouts.sql`; the three retired rows deleted from
   it; `004_worksheets.sql`'s `kind` CHECK gains `fields` and `recipe`. Rebuild through
   **Erase everything · Apply pending · Run seed**.
4. Measure both new heights against real paper. `recipe-card` at three thirds must land on
   a sheet of its own with nothing packed beside it.
5. Rebind the twenty-six with their specs, and land the §5 fixes above.

**Three caps become checkable here and are checked**: `fields` 12, `box-beside` 13,
`label-it` 1 (§4 rule 1). At this slice the library is 61 prompts, so none of them binds;
what this slice fixes is that a later batch can count against a real number.

**Every `fields` binding sets CAPTIONS.** Shipped with the empty default it becomes the
new ruled lines inside a month, which is the whole reason the form is capped.

**Every binding that sets `shared: 1` asks for the shared row in its wording** (§4 rule 2).

## Exit criteria

- All six forms print at their claimed heights, measured on paper.
- Every one of the sixty-one seeded week 1–3 prompts is bound to the form `LIBRARY_v3.md`
  §2 gives it. Nothing is bound to `box-caption`, `compare` or the `figures` form, and the
  three rows are gone.
- `cook-it` prints a recipe card on a clean sheet.
- A printed month shows no form twice, and no third overflows.
- `test/worksheet.test.js` covers `fields`, `recipe`, the rewritten `figures`, and the
  three new knobs.
- Both open questions answered, written into `DESIGN.md`, moved to the answered list.
- Drawable count reported: 52.

## Do not build

The 105 prompts. Nineteen layout rows exist and 106 rows have nowhere to be seeded from
yet; that is slices 15–19.
