# Slice 20 — Prompts: craft, food, voices — and the numbers

**Status:** built
**Band:** L
**Implements:** §13 (the last 12 of the 106 prompts), §16 (the paper numbers)
**Depends on:** 19

**Goal.** The last twelve prompts, and then the measurement the whole split has been
building toward. This is the first slice that can run the numbers `LIBRARY_v3.md` §3
reports, because it is the first slice at which the pool is the one they were measured
against.

Twelve rows of transcription and a day of measuring. The band is L for the second half.

---

## What it is, in numbers

| | Count |
|---|---|
| Prompts | 12 |
| `prompt_tags` rows | 31 topic, 7 mode |
| Drawable prompts at the end | **153** — the number the cooldown was sized for |

| Heading | New prompts |
|---|---|
| Making, wearing, and what they are proud of | 2 — `how-they-make-it` `before-you-visit` |
| Food | 8 — `school-lunch` `famous-dish` `holiday-dish` `something-sweet` `street-food` `drink-with-dinner` `market-days` `grows-better-there` |
| Voices | 2 — `hear-from-a-kid` `what-they-say-about-us` |

**The two Voices prompts are the whole of `personal-voice`.** Until they land, no month
can satisfy *every month holds at least one `personal-voice`* except by falling back, and
`src/lib/draw.js` says so in a comment that comes out with this slice.

**`school-lunch` asks for the shared row it prints** (§5), and `how-they-make-it` is the
third and last storyboard.

## Due-outs

None. D-15 is slice 22 and blocks only the last exit criterion below, which is why that
one is stated there rather than here.

## Open questions

None.

## Build

**Part one — the twelve prompts.** As slice 16: row, binding, spec, tags, between the
markers.

**Part two — the measurement.** Everything `LIBRARY_v3.md` §3 claims, run against the real
seeded library rather than the synthetic pool slice 11 used. `test/draw.test.js` already
holds the synthetic version of most of these; the work is to point them at the seed and
delete the comments that say the real run is slice 20's.

- Nine months back to back for one learner, per focus, 2,500 simulated months.
- The paper table: thirds per week, sheets per month, the fourth-sheet spill rate.
- The form caps against the finished 167.
- **Re-measure the focus table.** §3's *What each focus actually reaches* and *What the
  shape delivers* were measured with People and Power weighting `civic-process`, which
  slice 11 removed. Its reach is unchanged — `governance` covers the same four prompts —
  but those four fall from ×13 to ×7 and its measured columns move. Rewrite both tables
  in `LIBRARY_v3.md` §3 with what the finished library actually reports, and rewrite
  `FOCUS-AUDIT.md`'s counts the same way. These are current-state documents: the old
  numbers are deleted, not annotated.

## Exit criteria

The whole of `LIBRARY_v3.md` §3, and this is the slice that owns them.

- 167 week 1–3 prompts, 153 drawable, every one tagged and bound to a form.
- Nine months drawn back to back for one learner put an on-theme task in every week for
  seven of the nine focuses, and the two weakest are Ancient World and Conflict and Change
  at or under 42% and 57% *a week with none of it*.
- Nine months back to back never fall through to the stalest-back cooldown fallback.
- No form exceeds its cap: `box-beside` 13, `fields` 12, `table-3` 11, `label-it` 1.
- A month prints at 8.3 sheets, and a week spills to a fourth sheet in about 3% of weeks.
- Every one of the ten new renderers prints at the height its layout row claims, checked
  once more across a full printed month.
- Every month holds at least one `hands-on` and at least one `personal-voice`, without a
  fallback.
- §3's two measured tables and `FOCUS-AUDIT.md` report what the finished library does.

## Do not build

The twelve owed to Ancient World and Conflict and Change — slice 21. They are writing, and
the numbers above are the measurement of the library as specified, which is the thing to
have before deciding the twelve are still needed and still the right twelve.
