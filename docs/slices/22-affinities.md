# Slice 22 — The affinities

**Status:** built
**Band:** S
**Implements:** §9 (the three focuses' affinities)
**Depends on:** 11

**Goal.** `who-lives-here`, `who-gets-what` and `stories-and-spirits` were seeded, pickable
and drawn correctly, and no country card had ever recommended one of them. These are the
sixty rows that fixed it.

**It was independent of every other slice in the split** and needed nothing from slices
12–21. It sat last because it was blocked on the owner, not because anything waited on it.

---

## What it is, in numbers

| | Count |
|---|---|
| `country_focus_affinity` rows added | 60 — twenty countries per focus |
| Affinity rows in the file | 260, from 200 |
| Focuses covered | 9 of 9, from 6 |
| Affinities per adorned country | 3, from 2 |
| Code changed | none |

**Scores.** 23 exceptional, 37 good — Who Lives Here 6/14, Who Gets What 8/12, Stories and
Spirits 9/11. The existing 200 run about half threes; the three new focuses sit lower on
purpose, because a 3 has to mean the month is easy *and* unusually rewarding.

## Due-outs

**D-15 — done.** Sixty rows, twenty a focus, with a one-line reason apiece.

The rules are in `SEED-CONTENT.md` under *Focus affinities*: `score` is `3` exceptional fit
or `2` good fit and nothing else exists; `reason` is kid-facing, 15–90 characters, no full
stop, and it has to read out loud in one breath, because it prints under the focus name on
setup. There is no way to say "bad fit" and there should not be — any focus is allowed on
any country, and the app's job is to say what is good about a choice rather than argue with
it.

## Open questions

None.

## How the countries were chosen

**A reason line is a promise about the month, so the test is not whether a country is
interesting — it is whether the ten drawn prompts land there.** Each focus is a weighting
over tags and the tags reach a specific set of prompts, so every candidate was scored
against the prompts the focus actually pulls (`LIBRARY_v3.md` §2 read against §3's weight
table), not against the focus's name. All 85 prompts that decide these three focuses were
seeded by slice 20, so the promises are backed.

Four rules did the cutting.

**1. Only countries the shuffle can deal.** "Deal me three" draws from countries carrying
two or more hooks, so an affinity on an unadorned country is invisible to the picker. This
is the expensive rule: it cost **Qatar** and **Bangladesh**, the two best Who Gets What
months in the library, plus Singapore and Armenia. See D-15 for what to do about it.

**2. Findability at an 11-year-old's reading level beats importance.** Nauru's phosphate
and Myanmar's Rohingya expulsion are textbook Who Gets What and both were cut: adventure
level 3, and almost everything published is adult reporting. A recommendation on a country
the kid cannot research is a promise the app breaks in week 2.

**3. Contrast, not quality of life.** Who Lives Here rewards a day that is legibly
different from the reader's own and documented in English. Japan, Korea, Mongolia and Cuba
are 3s; Australia and Canada are absent, because their ordinary Tuesday prints as a
near-copy and `kid-life`, `what-a-kid-carries` and `before-you-visit` all come out flat.

**4. Who Gets What leans deliberately unglamorous**, per §9 — the countries it suits are
not the ones a kid picks off a map. Two rows point it at the reader's own sphere rather
than always outward: **GBR**, because the British Museum is the answer to
`somebody-elses-museum` for half the library, and **AUS**, because the Stolen Generations
and the 2008 apology are `forced-movement` somewhere a kid thinks is familiar.

**Where two focuses wanted the same country the stronger month won**, since a country takes
one new row and no more: Ethiopia went to Stories and Spirits over Who Lives Here, Mexico
to Stories over Who Lives Here, Greece to Stories over Who Gets What, Egypt to Stories over
Who Gets What, Indonesia to Stories over Who Gets What.

## Build

Sixty rows between the `-- BEGIN country_focus_affinity` / `-- END country_focus_affinity`
markers, in the paste-ready form `SEED-CONTENT.md` gives. Nothing else in the file changed.
An apostrophe inside a value is doubled; the last row in the block ends with no comma.

The inner join means an ISO3 or a focus slug matching nothing contributes no row and
raises no error, which is the one silent failure here.
`test/country-data.test.js` counts the block against what landed.

## Exit criteria

- All three focuses are recommended, with a reason, on at least one country card — twenty
  each, and every adorned country now carries three. ✓
- `test/country-data.test.js` counts sixty rows in and sixty rows landed — 260 total. ✓
- No existing affinity row changed. ✓
- Every affinity sits on a country the shuffle can deal. ✓ — a new test
- All nine focuses covered, each on fifteen countries or more. ✓

## Do not build

Rows for the other six focuses. They have 200 between them and nothing is asking for more.

Hooks for Qatar, Bangladesh, Singapore and Armenia. They are the right next piece of
country work and they are not this slice — see D-15.
