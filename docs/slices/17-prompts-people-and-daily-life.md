# Slice 17 — Prompts: who the people are, an ordinary day

**Status:** not started
**Band:** L
**Implements:** §13 (21 of the 106 prompts)
**Depends on:** 16

**Goal.** The third prompt batch, and the one that fills Who Lives Here and Who Gets What.
*Who the people are* is the largest subject heading in the library and the whole of it is
unseeded.

---

## What it is, in numbers

| | Count |
|---|---|
| Prompts | 21 |
| `prompt_tags` rows | 51 topic, 18 mode |
| Drawable prompts at the end | 114, from 93 |

| Heading | New prompts |
|---|---|
| Who the people are | 16 — `the-group-that-gets-less` `what-work-they-do` `the-job-a-kid-does` `how-many-languages` `most-common-names` `family-size` `young-or-old` `how-long-they-live` `who-can-read` `who-finishes-school` `when-you-are-old-enough` `how-you-get-a-house` `who-owns-the-roof` `who-came-and-who-left` `who-they-took-in` `where-they-go-when-they-go` |
| An ordinary day | 5 — `what-a-kid-carries` `what-they-can-plug-in` `what-they-keep` `street-animals` `find-them-near-us` |

`who-lives-there` and `how-they-learn` belong to *Who the people are* and were seeded in
slice 13 as `hundred-people`'s and `bullets`' first bindings. They are not seeded again.

**Three §5 rewrites are written correct from the start**, not applied afterwards:
`family-size` asks for the shared row it prints (§4 rule 2); `where-they-go-when-they-go`
is `table-3` rather than `map-marks`, because pin 1 was a foreign country;
`who-owns-the-roof`'s two pictograph rows are *own it there* and *own it here*, not three
numbers on a two-row form.

## Due-outs

None.

## Open questions

None. Two of the stretch-line six land here — `the-group-that-gets-less` and
`who-can-read` — under whatever slice 14 settled.

## Build

As slice 15. Row, binding, spec, tags, between the markers.

**Two `differences` bindings land here** — `family-size` and `when-you-are-old-enough` —
with two of the nine distinct closers, and `family-size` sets `shared: 1` and asks for it.

**Three `pictograph` bindings land here.** Each sets the key to ten per figure, and each
prompt asks for exactly two numbers and no more.

## Exit criteria

- 21 prompts seeded, bound and tagged; `test/seed-content.test.js` green.
- Nine months drawn for a learner on Who Lives Here and again on Who Gets What: both now
  put an on-theme task in nearly every week, which neither could before this batch.
- A month prints with no third overflowing.
- Drawable count reported: 114.

## Do not build

The other 42 prompts.
