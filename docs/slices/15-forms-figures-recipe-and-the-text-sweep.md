# Slice 15 — Forms: figures, recipe, and the text sweep

**Status:** not started
**Band:** L
**Implements:** §16 (two forms, two retirements, the `timeline` knobs), §13 (the last of the seeded rewrites)
**Depends on:** 14

**Goal.** The end of the forms work and the end of the seeded library's drift. `figures` is
rewritten into the form it should always have been, `recipe-card` takes `cook-it` off ruled
lines, `compare` and `figures` retire, and the twelve seeded prompts whose text changed
without their form changing are brought up to `LIBRARY_v3.md` §2.

**After this slice, every one of the sixty-one seeded week 1–3 prompts says and prints what
§2 says it does.** Exactly one of them — `wow-fact` — comes through the whole v3 rewrite
untouched.

---

## What it is, in numbers

| | Count |
|---|---|
| New renderer kinds | 1 — `recipe` |
| Renderer rewritten | 1 — `figures` |
| Kind gaining knobs | 1 — `timeline` (UNIT, ENDS) |
| New `worksheet_layouts` rows | 2 |
| Forms retired | 2 — `compare`, `figures` |
| Seeded prompts rebound | 7 |
| Seeded prompts rewritten with no rebind | 12 |
| Seeded prompts needing a spec fix only | 2 |
| Drawable prompts at the end | 52, unchanged |

**The forms.**

| Form | Kind | Thirds | Spec |
|---|---|---|---|
| `figure-anchor` | `figures` | 1 | `{"caption":"","unit":"","anchor_prompt":"About the same as…"}` |
| `recipe-card` | `recipe` | 3 | `{"ingredients":10,"steps":6,"sketch":true}` |

**`figures` is rewritten, not extended.** Today the branch prints three captioned number
boxes. `figure-anchor` is one large boxed number with its unit and a ruled line beneath,
and the anchor line is for something the kid already knows that is about the same size —
never a second unrelated fact. The old knobs go with the form that is retired, so nothing
is left reading a key that no longer exists.

**`recipe-card` at three thirds cannot pack with anything else**, which is the point: the
recipe always lands on a clean sheet that can come out of the binder and go on the counter.

**The seven rebindings.**

| Form | Seeded prompts |
|---|---|
| `figure-anchor` | `how-many-people` `size-next-to-yours` `getting-around` |
| `table-3` | `what-people-believe` |
| `lines-8` | `feast-they-keep` |
| `box-beside` | `tonights-dinner` |
| `recipe-card` | `cook-it` *(text unchanged)* |

**The twelve text-only rewrites.** Same form, same spec, different words — and none of them
is discoverable from `LIBRARY_v3.md` §2's `KEEP` / `UPDATE` markers, which is why they are
listed by name:

`anthem-listen` `before-history` `currency-animal` `kid-life` `kingdom-over-this-place`
`landforms` `language-hello` `life-outdoors` `story-they-tell` `war-that-changed`
`who-is-famous` `who-ruled-before`

Four of them are why `timeline` gains UNIT and ENDS: `who-ruled-before` now starts in 1500
and marks up to five times the land changed hands, which is a timeline with labelled
endpoints rather than two sentences.

**Two spec-only fixes.** `flag-draw` and `landmark-to-see` keep their form and their words
and drop from four ruled lines to two, which is the one sentence each of them asks for.
`landmark-to-see` is named in §5; `flag-draw` is not, and is the reason this slice diffs
rather than trusting the document's own list.

**The retirements clear here.** `compare`'s two prompts are `city-and-country` (to
`pictograph`, slice 13) and `size-next-to-yours` (above); the `figures` form's three are
`weather-there-now` and `highest-point` (to `scale-strip`, slice 12) and `how-many-people`
(above). Neither row can come out before this slice.

## Due-outs

None.

## Open questions

Two, both raised in `LIBRARY_v3.md` §7, both asked here because the code that depends on
them is a renderer and this is the last slice that touches one. One `AskUserQuestion` call
each, one at a time.

1. **Does `storyboard` gain a CAPTION knob?** Three week-3 storyboards — a legend, a Bible
   account, a process — print as six identical panels without it. It would be the one new
   knob in v3. `story-they-tell` is seeded and rewritten in this slice; the other two land
   in slices 19 and 20, so the answer has to exist before they do.
2. **Does *who published this, and what do they want you to think* become a stretch line
   on the six hardest prompts, or stay a footer?** The six are
   `the-group-that-gets-less`, `who-can-read`, `what-their-money-goes-to`,
   `is-the-law-kept`, `can-they-worship-freely`, `the-company-that-got-caught`, spread
   across slices 16, 17 and 18. **There is no stretch-line mechanism anywhere in the
   schema or the renderer today** — `LIBRARY_v3.md` carries exactly one *Stretch:* line, on
   `how-far-away-is-it`, and nothing prints it. So this is really two questions: whether
   the six get the line, and whether a stretch line is a thing a prompt can have. If the
   answer is a line, this slice builds it; the prompt slices then carry data and nothing
   more.

## Build

1. One `KINDS` entry and one `RENDER` branch for `recipe`; `figures` rewritten; `unit` and
   `ends` added to `timeline`.
2. A CSS block each in `public/css/print.css`.
3. Two layout rows into `005_worksheet_layouts.sql`; `compare` and `figures` deleted from
   it; `004_worksheets.sql`'s `kind` CHECK gains `recipe`. Rebuild through **Erase
   everything · Apply pending · Run seed**.
4. Measure both heights against real paper.
5. The seven rebindings with their specs and their §2 text; the twelve text rewrites; the
   two spec fixes.

**No ENDS value hard-codes a year** (§4 rule 5). *A hundred years ago* and *Today*, not
*1925*. Seven `timeline` bindings exist across the library and four are seeded; all four
get labels here.

**The anchor line is never a second fact.** `how-far-away-is-it` was written with a flight
time in the anchor slot and is corrected in slice 16; the three seeded `figure-anchor`
prompts are corrected here.

## Exit criteria

- Both forms print at their claimed heights, measured on paper. `cook-it` prints a recipe
  card alone on a sheet.
- Nothing is bound to `compare` or the `figures` form, and both rows are gone.
- **Every seeded week 1–3 prompt's title, text, form and spec match `LIBRARY_v3.md` §2** —
  checked by diffing all sixty-one against the document, not by reading its `KEEP` /
  `UPDATE` markers, which disagree with the text in forty-two places.
- A printed month shows no form twice and no third overflowing.
- `test/worksheet.test.js` covers `recipe`, the rewritten `figures`, and the `timeline`
  knobs.
- Both open questions answered, written into `DESIGN.md`, moved to the answered list.
- Drawable count reported: 52.

## Do not build

The 106 prompts. All nineteen layout rows and all ten renderers exist after this slice, and
nothing more is owed to the seeded sixty-one — slices 16 to 20 are pure addition.
