# Slice 15 — Prompts: deep time, empire, the Book, government

**Status:** not started
**Band:** L
**Implements:** §13 (24 of the 106 prompts)
**Depends on:** 14

**Goal.** The first prompt batch. Every form these prompts bind to exists after slice 14,
which is what makes a prompt slice a transcription job rather than a build.

The batch boundary is `LIBRARY_v3.md` §2's own subject headings, so a later session can
find it again without a note.

---

## What it is, in numbers

| | Count |
|---|---|
| Prompts | 24 |
| `prompt_tags` rows | 65 topic, 11 mode |
| Drawable prompts at the end | 74, from 52 |

**The headings this batch covers**, in library order:

| Heading | New prompts |
|---|---|
| Week 1 — the fixed opening | 2 — `how-far-away-is-it` `in-their-numbers` |
| Before there was anybody | 2 — `long-before-people` `dinosaur-that-lived-here` |
| The first people, and what is still standing | 0 — both already seeded |
| History, empire, and what was carried off | 6 — `the-last-hundred-years` `who-was-taken-from-here` `somebody-elses-museum` `when-it-reached-everybody` `made-there-first` `how-they-say-it-began` |
| The Book and this land | 4 — `bible-name-now-name` `bible-in-their-tongue` `the-first-church-there` `can-they-worship-freely` |
| Government, law, and the people asking for something | 10 — `how-a-law-is-made` `is-the-law-kept` `if-you-break-a-rule-there` `whats-in-the-news` `what-they-plan-next` `who-speaks-up-there` `what-they-do-for-you` `who-comes-when-it-burns` `help-when-money-runs-out` `what-they-are-working-on` |

The two week-1 rows are `wild` tier and not drawable — they compete for week 1's fifth
slot, which is why the drawable count rises by 22 and not 24.

## Due-outs

None.

## Open questions

One, raised in `LIBRARY_v3.md` §7 and asked here because this is the first slice that
writes to the tag vocabulary at the week-1 end of it.

**Does `emblems` exist at all?** Four members — `flag-draw`, `currency-animal`,
`national-symbol`, `anthem-listen` — all in week 1, all seeded, and no focus weights it or
ever will, since week 1 is not drawn from the weighted pool. It is honest documentation
and dead weight in the same row. Deleting it is four `prompt_tags` rows; keeping it is a
tag the focus tab shows with four members no focus can reach.

## Build

**`SEED-CONTENT.md` is the reference and it carries the paste-ready block forms.** A row
goes between the `-- BEGIN task_templates` / `-- END task_templates` markers in
`002_seed.sql` in the form shown there, and its tags between the `prompt_tags` markers.
Nothing else in the file changes. This is the same edit 106 times across slices 15–19.

For each prompt: the row, its binding in `005_worksheet_layouts.sql`, its per-template
spec where §2 declares one, its two to four topic tags, its zero to two mode tags.

**A prompt and its tags land in the same edit, always.** An untagged prompt draws at
baseline forever and nothing in the app reports it — it is the one failure in this work
that is silent, and `test/seed-content.test.js` fails on it rather than letting it
through.

**Two rules are checked against the whole form, not the batch.** No two `differences`
bindings share a closing sentence; no two `flow-steps` bindings share an opening one (§4
rule 3). One of each lands in this batch.

**Every prompt carries a fallback clause** (§4 rule 4). A prompt that dead-ends for Bhutan
is a prompt swapped by hand.

**No spec value hard-codes a year** (§4 rule 5) — `ends: ["A hundred years ago","Today"]`,
never a date. Three `timeline` bindings land here.

## Exit criteria

- 24 prompts seeded, every one bound to a form, every one tagged.
- `test/seed-content.test.js` counts each block against the rows that landed — the inner
  joins mean a mistyped slug contributes no row and raises no error.
- Nine months drawn back to back for one learner and read: the new government and Book
  prompts appear, and no month draws two prompts sharing a mode tag.
- A month prints with no third overflowing.
- Drawable count reported: 74.
- `emblems` answered, written into `DESIGN.md`, moved to the answered list.

## Do not build

The other 82 prompts. The twelve owed to Ancient World and Conflict and Change — slice 20;
they are writing, not transcription, and mixing them in hides which is which.
