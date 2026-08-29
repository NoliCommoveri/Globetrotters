# Slice 12 — The library

**Status:** not started
**Band:** XL — **do not start it as one session.** See *How to split it*.
**Implements:** §13, §16 (the nineteen forms), §9 (the three focuses' affinities)
**Depends on:** 11

**Goal.** `LIBRARY_v3.md` §2 is a library in a document. This puts it in the database, so
the draw slice 11 built has the pool it was measured against.

It is the largest remaining piece of work in the project and until now it was invisible in
this index — `LIBRARY_v3.md` §6 sequences it in a paragraph, and a paragraph is not a
slice.

---

## What it is, in numbers

| | Count |
|---|---|
| Week 1–3 prompts in `LIBRARY_v3.md` §2 | 167 |
| Already seeded | 60 |
| Seeded by slice 11 (`cook-it`) | 1 |
| **Prompts this slice writes** | **106** |
| `worksheet_layouts` rows to add | 19 |
| New renderer branches in `worksheet.js` | 10 |
| `prompt_tags` rows across the 167 | 423 topic, 105 mode |
| `country_focus_affinity` rows | ~60 (D-15) |
| Prompts still owed to Ancient World and Conflict and Change | 12 |

**Nothing seeded is dropped.** The six prompts `LIBRARY_v3.md` §5 retires were never
seeded, and none of the 60 that were is one of them. This slice only adds — which is what
makes it safe to land in pieces.

Three of the twelve seeded layouts are retired as forms: `box-caption`, `compare` and
`figures`. `figures` survives as the *renderer* `figure-anchor` rides; the other two carry
no v3 binding. `checklist` stays as week 4's composed sheet.

## Due-outs

- **D-15** `country_focus_affinity` rows for `who-lives-here`, `who-gets-what` and
  `stories-and-spirits` — roughly twenty countries each with a one-line reason.
  **Outstanding.** All three focuses are seeded and pickable after slice 11; without these
  rows none of them is ever *recommended* on a country card. Blocks one part of this slice
  and nothing else — build the rest and say what was left.

## Open questions

Three, all raised in `LIBRARY_v3.md` §7 and none of them blocking until this slice starts.
Each is asked and answered before the code that depends on it, one at a time.

1. Does *who published this, and what do they want you to think* become a stretch line on
   the six hardest prompts, or stay a footer? Affects six prompts and one renderer.
2. Does `storyboard` gain a CAPTION knob? Three week-3 storyboards — a legend, a Bible
   account, a process — print as six identical panels without it. It would be the one new
   knob in v3.
3. Does `emblems` exist at all? Four members, all in week 1, never drawn against.

`civic-process` was the fourth and slice 11 settled it: the tag stays, the weight goes.

## Build

One ordering is forced and the rest is free. **A prompt cannot be seeded before its form
exists**: `worksheet_layouts.kind` is a CHECK constraint, and a binding points at a layout
row. So forms lead prompts, always. With Erase everything the CHECK is an edit to
`004_worksheets.sql` rather than a table rebuild, but the ordering inside a rebuild is the
same.

### Forms

Nineteen layout rows and ten renderer branches. Each renderer is a branch in
`src/lib/worksheet.js`, a block in `public/css/print.css`, and a height in thirds measured
against real paper before it is trusted — `LIBRARY_v3.md` §3's paper table is only true if
the heights are.

Four knobs ride along: MARKER `bullet` on `checklist`, BELOW on `box`, MIDDLE on the new
`pair`, LINES on the new `clocks`.

### Prompts and their tags

106 rows into `002_seed.sql`, each with its form binding, its spec, its topic tags and its
mode tags. **A prompt and its tags land together, always.** An untagged prompt draws at
baseline forever and nothing in the app reports it — it is the one failure in this slice
that is silent.

### The twelve owed prompts

Six week-3-flavoured prompts each for Ancient World and Conflict and Change. They have
twelve and ten on-theme prompts against a 153 pool, which is what leaves them at 42% and
57% *a week with none of it* where every other focus is under 20%. No weighting reaches
what is not written.

### The affinities

D-15's ~60 rows, into `003_country_data.sql` or typed into the library editor's focus tab.

## How to split it

**The split is the next session's call, not this file's.** What this file owes that session
is the seams, what must not be cut, and how to tell a piece has landed.

**The seams.**

- **Forms and renderers.** Nineteen layouts, ten renderers, the CSS and the measured
  heights. Verifiable on its own: rebind a handful of already-seeded prompts to the new
  forms and print a month.
- **Prompts and tags.** 106 prompts in batches. Verifiable by drawing months and reading
  what comes out.
- **The twelve owed prompts.** Their own piece, and the only one that is writing rather
  than transcription.
- **The affinities.** D-15, independent of all of the above and blocked on the owner.

**What must not be cut.** A renderer, its CSS block and its measured height are one thing —
a layout row whose height was guessed is worse than no layout row, because the packer
believes it. A prompt and its tags are one thing, for the reason above. A form and the
first prompt bound to it are one thing, or nothing exercises the renderer.

**Where the prompt batches break.** `LIBRARY_v3.md` §2's own subject headings — *Before
there was anybody*, *The first people, and what is still standing*, and so on. They are
already ordered by subject, they are already sized at four to eight prompts, and a batch
boundary that follows them is a boundary a later session can find again without a note.

**A partial library is a working library, and that is what makes this splittable at all.**
The draw does not care how big the pool is: 60 prompts draws a month, 100 draws a better
one, 167 draws the one that was measured. Nothing breaks at an intermediate size and no
screen shows a gap. The one number that degrades quietly is the cooldown — at 49 drawable
it exhausts by month six (slice 11, *Proved in slice 12*) — so **a session that lands a
batch should say what the drawable count now is**, and the nine-month criteria below stay
unclaimed until it reaches 153.

**One rule for any split.** Each piece ends at a state you can open in a browser and judge,
same as every other slice in this index. Forms end at a printed sheet. Prompts end at a
drawn month. Neither ends at a seed file that ran.

## Exit criteria

The whole slice, however it is split. Everything here needs the full library, which is why
slice 11 could not claim it.

- 167 week 1–3 prompts, 153 drawable, every one tagged and bound to a form.
- Nine months drawn back to back for one person put an on-theme task in every week for
  seven of the nine focuses, and the two weakest are Ancient World and Conflict and Change
  at or under 42% and 57% *a week with none of it*.
- Nine months back to back never fall through to the stalest-back cooldown fallback.
- No form exceeds its cap: `box-beside` 13, `fields` 12, `table-3` 11.
- A month prints at 8.3 sheets, and a week spills to a fourth sheet in about 3% of weeks.
- Every one of the ten new renderers prints at the height its layout row claims.
- All three new focuses are recommended on at least one country card (D-15).

## Do not build

Nothing further. This slice is the end of the build as specified: `DESIGN.md` and
`LIBRARY_v3.md` have no section left unimplemented after it.
