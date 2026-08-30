# Slice 17 — Prompts: money, land, weather, living things

**Status:** built
**Band:** M
**Implements:** §13 (19 of the 106 prompts)
**Depends on:** 16

**Goal.** The second prompt batch: the four subject headings that carry the physical
country and who is paid for it.

---

## What it is, in numbers

| | Count |
|---|---|
| Prompts | 19 |
| `prompt_tags` rows | 53 topic, 15 mode |
| Drawable prompts at the end | 93, from 74 |

| Heading | New prompts |
|---|---|
| Money, work, and who is actually paid | 8 — `where-the-price-goes` `the-company-that-got-caught` `the-work-nobody-wants` `who-they-trade-with` `made-because-they-needed-it` `what-their-money-goes-to` `your-money-there` `their-working-day` |
| The land | 6 — `how-high-they-live` `where-the-ground-shakes` `where-the-food-grows` `what-the-land-is-used-for` `water-to-the-tap` `where-the-trash-goes` |
| Weather and water | 3 — `rain-in-a-year` `rain-through-the-year` `climate-bands` |
| Living things | 2 — `the-one-that-is-gone` `plants-that-heal` |

`what-work-pays` belongs to *Money, work, and who is actually paid* and was seeded in
slice 12 as `bar-graph`'s first binding. It is not seeded again — the insert is
`ON CONFLICT DO NOTHING` and would silently do nothing, which is worse than an error.

`climate-bands` is rebound `label-it` → `map-marks` at four pins (§5). It is written here
as a `map-marks` prompt from the start; the rename table is history and there is nothing
to migrate.

## Due-outs

None.

## Open questions

None. If slice 15 answered the stretch-line question as a line, two of the six prompts it
covers land here — `the-company-that-got-caught` and `what-their-money-goes-to` — and
carry it as data.

## Build

As slice 16: row, binding, spec, topic tags, mode tags, between the markers in
`002_seed.sql` and `005_worksheet_layouts.sql`, in the paste-ready forms
`SEED-CONTENT.md` gives.

**Two `flow-steps` bindings land here** — `water-to-the-tap` and `where-the-trash-goes` —
and neither may open with the sentence the other does, or the one in slice 16 does.

**Three `map-marks` bindings land here**, and every pin on each is a place inside the
country or on its edge (§4 rule 6). PINS is never 1.

**`label-it` stays at one binding.** `climate-bands` was written against it and is not
bound there.

## Exit criteria

- 19 prompts seeded, bound and tagged; `test/seed-content.test.js` green.
- Nine months drawn back to back and read: the land and money prompts appear across both
  weeks, not clustered in one.
- A month prints with no third overflowing, and no form appears twice in a week.
- Drawable count reported: 93.

## Do not build

The other 63 prompts.
