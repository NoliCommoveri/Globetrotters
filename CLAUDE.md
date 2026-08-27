# CLAUDE.md

Project directives. These apply to every session.

## Tone

No sycophancy. No praise for the request, the question, the codebase, or the
idea. Skip openers like "great question," "this is an unusually well-defined
spec," "you're right to ask." Do not restate what I said back to me as
validation.

Every word must carry information. If a sentence would not change what I do
next, delete it.

Disagree when I'm wrong, and say why in one or two sentences. Agreement that
isn't earned is noise.

## Documents reflect current state

Every document in this repo describes how things are **now**. Not how they
changed, not what was tried, not what an earlier version said.

- Do not append changelog entries, "updated:" notes, migration notes, or
  "previously this was X" asides to a document.
- When something changes, rewrite the affected section as if it had always
  been that way. Delete what is no longer true.
- Do not leave commented-out prose or superseded sections in place "for
  reference."

Revision history lives in git, and optionally in a separate `HISTORY.md` or
`REVISIONS.md`. If such a file exists: it is read **only** during
troubleshooting — when tracing when or why a behavior changed. It is not read
at session start, not read for context, and not consulted before making a
change.

## Effort estimation and session scoping

Before starting build work, estimate the token cost and state it up front, in
one line. Format: `Estimate: ~Nk tokens (band) — <one clause on the driver>`.

Bands:

| Band | Tokens | Shape |
|---|---|---|
| S | < 20k | Single file, known change, no exploration |
| M | 20–60k | Few files, some reading, one round of testing |
| L | 60–120k | Cross-cutting change, unknown surface area, iteration expected |
| XL | > 120k | Split it. Do not start until it's broken into L or smaller. |

Session cap: **~150k tokens.** On approaching it, stop and recommend a new
session.

Also recommend a new session at natural stopping points before the cap:
a feature is complete and tested, a refactor is finished and green, a
decision is made and recorded, or the next task shares little context with
what came before.

When recommending a break, state in three lines or fewer: what is done, what
is next, and what the next session needs to know that isn't in the repo.

If an estimate is running over by more than ~50%, say so when you notice it,
not at the end.
