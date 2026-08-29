# Slice 21 — The affinities

**Status:** not started — blocked on D-15
**Band:** S
**Implements:** §9 (the three focuses' affinities)
**Depends on:** 11

**Goal.** `who-lives-here`, `who-gets-what` and `stories-and-spirits` are seeded, pickable
and drawn correctly, and no country card has ever recommended one of them. This is the
sixty rows that fix that.

**It is independent of every other slice in the split** and needs nothing from slices
12–20. It sits last because it is blocked on the owner, not because anything waits on it.
Take it the day the rows exist.

---

## What it is, in numbers

| | Count |
|---|---|
| `country_focus_affinity` rows | ~60 — roughly twenty countries per focus |
| Focuses covered at the end | 9 of 9, from 6 |
| Code changed | none |

## Due-outs

**D-15 — `country_focus_affinity` rows for `who-lives-here`, `who-gets-what` and
`stories-and-spirits`. Outstanding, and it blocks the whole of this slice.**

Roughly twenty countries each, with a one-line reason apiece. The 200 rows in
`003_country_data.sql` cover the other six focuses and none of the three. A focus with no
rows is never recommended for any country on any country card, forever: it is pickable and
never suggested.

It matters most for Who Gets What, because the countries that focus suits are not the ones
a kid picks off a map.

The rules are in `SEED-CONTENT.md` under *Focus affinities* and they are short: `score` is
`3` exceptional fit or `2` good fit and nothing else exists; `reason` is kid-facing, 15–90
characters, no full stop, and it has to read out loud in one breath, because it prints
under the focus name on setup. There is no way to say "bad fit" and there should not be —
any focus is allowed on any country, and the app's job is to say what is good about a
choice rather than argue with it.

Two ways in, both browser-only: added to the block in `003_country_data.sql` and landed
with **Run seed**, or typed into the library editor's focus tab. The list is keyed on
`(country_id, focus_id)` and takes the ordinary `ON CONFLICT DO NOTHING`, so it can be
extended for any country at any time — unlike the hooks.

## Open questions

None.

## Build

Sixty rows between the `-- BEGIN country_focus_affinity` / `-- END country_focus_affinity`
markers, in the paste-ready form `SEED-CONTENT.md` gives. Nothing else in the file changes.
An apostrophe inside a value is doubled; the last row in the block ends with no comma.

The inner join means an ISO3 or a focus slug matching nothing contributes no row and
raises no error, which is the one silent failure here.
`test/country-data.test.js` counts the block against what landed.

## Exit criteria

- All three focuses are recommended, with a reason, on at least one country card.
- `test/country-data.test.js` counts sixty rows in and sixty rows landed.
- No existing affinity row changed.

## Do not build

Rows for the other six focuses. They have 200 between them and nothing is asking for more.
