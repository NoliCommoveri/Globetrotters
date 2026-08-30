# Slice 21 — The twelve owed prompts

**Status:** built
**Band:** M
**Implements:** §13 (twelve prompts beyond the 167)
**Depends on:** 20

**Goal, met.** Ancient World and Conflict and Change held twelve and ten on-theme prompts
against a 153 pool where every other focus was at seventeen or better, and each held a
single natural-week-3 prompt on theme. They now hold eighteen and seventeen, seven and
eight of them in week 3, against a 165 pool. No weighting reaches what is not written,
which is why this slice is writing rather than tuning.

This is the one piece of the library that is writing rather than transcription, which is
why it is its own slice. `LIBRARY_v3.md` §7 item 5 is the whole specification: six
week-3-flavoured prompts each.

---

## What it is, in numbers

| | Count |
|---|---|
| Prompts written | 12 — six for `ancient-world`, six for `conflict-and-change` |
| `prompt_tags` rows | 34 topic, 2 mode |
| Drawable prompts at the end | 165 |
| Week 1–3 prompts at the end | 179 |

**Two mode tags across twelve prompts, and that is deliberate.** `MODE_CAP` is two a month
and counts the pins from the start, so `cook-it` spends one of `hands-on`'s two seats every
month and `us-contrast` runs 41 members against two. A mode tag is a queue, and most of
these prompts do not need to stand in one. The two that carry one earn it: `their-flood-story`
has the kid read Genesis 6–8, and `the-one-who-would-not-back-down` asks for a sentence
somebody there actually said. The second is a net gain for the draw — `personal-voice` is
one of the two balance modes the wildcards repair, and it goes from eight members to nine.

**Week-3-flavoured is the point, not a preference.** Both focuses' on-theme prompts are
eleven-to-one and nine-to-one weighted toward the natural week 2. The deal leans a natural
week 2 toward the earlier week, so the material they have cannot reach week 3 — which is
where a whole week with none of it comes from. §3 names the shapes: an ordinary thing
still done the old way, a dish a conqueror left behind, a word a war put in the language,
a street that moved.

## Due-outs

None.

## Open questions

None known. A question raised while writing is asked before the prompt that depends on it,
one at a time, and not guessed.

## Build

**Write to the rules the library already holds, and they are all in `SEED-CONTENT.md` and
`LIBRARY_v3.md` §4.** One action, ten minutes, second person, works in Peru and in Japan
without editing. A fallback clause on every one. Two to four topic tags from §3's
vocabulary and zero to two mode tags from the seven. A form binding and a spec that
matches the prompt count for count — a slot for every thing the prompt asks for, and an
ask for every slot it carries.

**The caps decide which forms are available.** After slice 20 the library is at its
measured shape: `box-beside` is at thirteen and `fields` at twelve, so neither takes a new
prompt. Twelve new prompts go on forms that make the answer visible, and the cap table in
§3 is what says which.

**No two bindings on one form share a closing sentence** (§4 rule 3), checked against the
whole form and not the twelve.

**These prompts are new spec, so `LIBRARY_v3.md` §2 gains them** under the two week-3
headings they belong to, written the same way every other entry is, and §3's counts are
rewritten to include them. §7 item 5 comes out — it is no longer open.

## Exit criteria

All met.

- **12 prompts seeded, bound and tagged.** `test/seed-content.test.js` green, and the whole
  suite with it — 358 tests. The drawable count is **165** and the library is 209 templates,
  distributed 12 / 86 / 81 / 30.
- **Nine months back to back, 2,500 runs per focus.** *A week with none of it* falls from
  33% to **22%** for Ancient World and from 43% to **27%** for Conflict and Change. Both
  before and after are measured with the same instrument; see the note below on why the
  before does not match what slice 20 recorded.
- **The three caps still hold.** `box-beside` 13, `fields` 12, `label-it` 1 — none of the
  twelve goes on any of them. `table-3` rose 11 → 12 and now ties `fields`.
- **A month prints at 9.2 sheets**, unchanged: 2.1 + 2.9 + 3.2 + 1.0. Week 3 spills to a
  fourth sheet 18% of the time rather than 15%, because seven of the twelve are on
  two-thirds forms — the week-3 forms with room were the tall ones, `box-beside` and
  `fields` both being at cap.
- **`LIBRARY_v3.md` §2 and §3 describe the library that exists.** The twelve are in §2
  under two new week-3 headings, *What the old world left here* and *Why it happened*; §3's
  form table, pool counts, mode-tag table, reach table and shape table are all rewritten;
  §7 is closed.

## What the twelve are

Six for Ancient World, all natural week 3, on the forms with week-3 room:

| Slug | Form | What it asks |
|---|---|---|
| `their-flood-story` | `venn` | This country's flood account set against Genesis 6–8 |
| `the-great-beast` | `label-small` | The great creature in their oldest accounts, drawn and labelled |
| `was-the-week-always-seven` | `then-now` | What they counted days by before, and when seven arrived |
| `what-the-empire-left` | `specimen-boxes` | Four things an empire left that are still in use |
| `still-done-the-old-way` | `flow-steps` | Something still made by hand the way it always was |
| `the-oldest-thing-still-alive` | `figure-anchor` | The oldest thing there still doing its job |

Six for Conflict and Change, all asking *why* rather than *what*:

| Slug | Form | What it asks |
|---|---|---|
| `what-was-already-true` | `table-3` | Three things already true before anybody fought |
| `the-spark` | `then-now` | The small thing that finally set it off |
| `who-wanted-what` | `differences` | What each side said it wanted, and what it stood to gain |
| `the-change-without-a-war` | `list-n` | A change nobody fought over, and the five things that led to it |
| `why-they-left-when-they-did` | `timeline` | Why the leaving happened in that year and not five earlier |
| `the-one-who-would-not-back-down` | `box-note` | The person who kept pushing, and what it cost them |

**Every conflict prompt written before this slice asks what, when or who.** `war-that-changed`
marks a war's start, turn and end; `border-that-moved` asks what changed; `independence-day`
asks who was in charge before. None asked why, and cause is the part a kid cannot lift off a
search result in one line. That is what these six add, and it is a better fix than the
residue shapes §3 originally suggested — *a dish a conqueror left behind, a word a war put
in the language* — which would have been six more what-prompts.

## Two things the next session should know

**§3's *What the shape delivers* table could not be reproduced.** Slice 20 recorded Ancient
World at 21% and Conflict and Change at 27% *a week with none of it* against the 153 pool.
Re-measured from `002_seed.sql` and `FOCUS-AUDIT.md` with the formula `draw_weight` actually
uses, that same pre-slice-21 library sits at 33% and 43%; the other seven focuses land within
a few points of what slice 20 reported. The table now carries a before and after taken with
one instrument, and says so. Slice 20's conclusion was not affected — those two focuses were
the thin ones and the gap was content — but its absolute figures were not reproducible.

**§3's *Heaviest prompt* column was stale in the same way**, reporting ×7 to ×11 where the
engine's own `1 + 2 × Σ` computes ×13 to ×21 for the same rows. `rain-through-the-year`
reaches ×21 for Land and Sky and `who-was-taken-from-here` ×19 for Conflict and Change. The
column is corrected. The twelve were written to a ×11 ceiling so none of them displaces a
prompt already in the library.

## Do not build

Anything for the other seven focuses. They are at seventeen on-theme prompts or better and
the draw reaches them.
