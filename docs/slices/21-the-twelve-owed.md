# Slice 21 — The twelve owed prompts

**Status:** not started
**Band:** M
**Implements:** §13 (twelve prompts beyond the 167)
**Depends on:** 20

**Goal.** Ancient World and Conflict and Change reach twelve and ten on-theme prompts
against a 153 pool, and every other focus is at seventeen or better. That is what leaves
them at 21% and 27% *a week with none of it*, the two highest of the nine, where the rest
run 2% to 16%. No weighting reaches what is not written.

This is the one piece of the library that is writing rather than transcription, which is
why it is its own slice. `LIBRARY_v3.md` §7 item 5 is the whole specification: six
week-3-flavoured prompts each.

---

## What it is, in numbers

| | Count |
|---|---|
| Prompts written | 12 — six for `ancient-world`, six for `conflict-and-change` |
| `prompt_tags` rows | roughly 36 topic, 12 mode |
| Drawable prompts at the end | 165 |
| Week 1–3 prompts at the end | 179 |

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

- 12 prompts seeded, bound and tagged; `test/seed-content.test.js` green.
- Nine months back to back for a learner on Ancient World, and again on Conflict and
  Change: *a week with none of it* is below where slice 20 measured it, and reported.
- The three caps still hold.
- A month prints at about 9.2 sheets, unchanged.
- `LIBRARY_v3.md` §2 and §3 describe the library that exists.

## Do not build

Anything for the other seven focuses. They are at seventeen on-theme prompts or better and
the draw reaches them.
