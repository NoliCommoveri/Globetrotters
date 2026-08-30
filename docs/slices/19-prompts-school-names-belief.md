# Slice 19 — Prompts: school, names, belief

**Status:** built
**Band:** L
**Implements:** §13 (27 of the 106 prompts)
**Depends on:** 18

**Goal.** The fourth and largest prompt batch: the three week-3 subject headings that
carry Stories and Spirits, the deepest focus in the library.

---

## What it is, in numbers

| | Count |
|---|---|
| Prompts | 27 |
| `prompt_tags` rows | 71 topic, 20 mode |
| Drawable prompts at the end | 141, from 114 |

| Heading | New prompts |
|---|---|
| School, work, and getting by | 9 — `what-every-kid-learns` `from-school-to-work` `first-money-they-earn` `getting-around-if-you-cant-walk` `if-you-get-sick` `what-they-plow-with` `where-you-buy-clothes` `have-they-been-away` `city-then-and-now` |
| Names, words and what is funny | 6 — `a-whole-name` `what-they-name-babies-now` `their-alphabet` `word-they-have` `ask-for-the-bathroom` `what-makes-them-laugh` |
| Belief, legend, and the shape of their year | 12 — `who-worships-what` `when-sabbath-starts` `sun-up-sun-down` `nations-before-the-throne` `bible-happened-here` `creature-they-warn-about` `luck-there` `what-the-old-people-say` `how-they-remember-the-dead` `holidays-through-the-year` `same-day-different-name` `what-year-is-it-there` |

**Two `clock-pair` bindings land here** — `when-sabbath-starts` and `sun-up-sun-down` —
and with `time-there-now` in week 1 and `their-working-day` in week 2 that is the form's
full four, split two and two across weeks 2 and 3 so no month can draw three of them.

**`bible-happened-here` is the second of the three storyboards.** Whatever slice 15
settled about a CAPTION knob applies to it here.

## Due-outs

None.

## Open questions

None.

## Build

As slice 16. Row, binding, spec, tags, between the markers.

**Five of the family's Sabbath and Kingdom prompts are now in the library** — two in week
2, three in week 3 (`DESIGN.md` §13). `nations-before-the-throne` and `when-sabbath-starts`
land here. A scripture reference is the one thing a prompt may assert, because a citation
can be checked; whatever the kid is asked to find stays a lead.

**One `venn` binding lands here** — `same-day-different-name` — and `venn` is held to
three bindings across the library. The other two are seeded.

**Twenty-seven rows is the biggest batch in the split.** If it runs long, the boundary
inside it is the subject heading: *Belief, legend, and the shape of their year* is a clean
stop, and a session that stops there says so and reports the drawable count it reached.

## Exit criteria

- 27 prompts seeded, bound and tagged; `test/seed-content.test.js` green.
- Nine months drawn for a learner on Stories and Spirits: an on-theme task in effectively
  every week.
- A month prints with no third overflowing.
- Drawable count reported: 141.

## Do not build

The last 12 prompts of the 106 — slice 20, which also carries the whole-library exit
criteria and needs the pool complete to claim them.
