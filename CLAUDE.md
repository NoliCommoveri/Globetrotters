# CLAUDE.md

Project directives. These apply to every session.

---

## Repo structure

```
CLAUDE.md                     these directives
README.md                     one-page map of the repo

docs/
  design/
    DESIGN.md                 the spec. Sections carry completion markers.
  slices/
    INDEX.md                  the slice map: order, dependencies, status
    NN-name.md                one file per slice, NN in build order
  other/
    DUE-OUTS.md               what the owner must provide, by slice
    OPEN-QUESTIONS.md         questions blocking build, and answered ones

src/
  index.js                    Worker entry, routing
  api/                        /api/* handlers
  admin/                      /admin/* pages and /admin/api/* handlers
  lib/                        draw engine, auth, migration runner, splitter
  migrations/*.sql            append-only, zero-padded ids
public/                       static assets: fonts, css, js, wall
wrangler.toml
.github/workflows/deploy.yml
```

`src/` and `public/` do not exist until slice 00 creates them. Do not create
them ahead of it.

---

## Every build session, in order

**1. Find the slice.** A session asked to build reads `docs/slices/INDEX.md`,
takes the first slice not marked built, and reads that slice file. The slice
holds the detailed instructions for what it builds: which design sections it
implements, its due-outs, its open questions, its build steps, its exit
criteria, and what it must not build.

**Do not build without a slice.** If the work asked for has no slice, say so
and write the slice first, as its own piece of work. A slice is written from
`DESIGN.md`, not invented.

**2. Surface due-outs before writing any code.** Read the slice's due-outs
against `docs/other/DUE-OUTS.md`. Anything the owner has to provide and hasn't
— a Cloudflare D1 database that doesn't exist yet, a secret not set, a font
file not licensed — is stated at the top of the session, plainly, before the
first line of code. Not discovered halfway through and not worked around.

If a due-out blocks the slice entirely, stop and say what is needed. If it
blocks part of it, build the rest and say exactly what was left and why.

**3. Answer open questions before building, never guess.** The slice lists its
open questions. Each one is asked and answered before the code that depends on
it is written.

- **One question at a time.** One `AskUserQuestion` call, one question. Not a
  batch, not a numbered list in prose.
- **Concise.** The question, the options, and one line on what each option
  costs. No recap of the design doc.
- **No guessing, no placeholders, no "assuming X for now."** An unanswered
  question is a stop, not a default.

Once answered, the answer is written into `DESIGN.md` as settled spec and the
question moves to the answered list in `docs/other/OPEN-QUESTIONS.md`.

**4. Mark completion when the code lands.** When a slice's exit criteria pass:

- Set the slice's status to `built` in the slice file and in
  `docs/slices/INDEX.md`
- Update the status marker on every `DESIGN.md` section the slice implements

A design section is `built` only when every slice implementing it is built.
Until then it is `partial` and names what remains.

---

## Documents reflect current state

Every document in this repo describes how things are **now**. Not how they
changed, not what was tried, not what an earlier version said.

- Do not append changelog entries, "updated:" notes, migration notes, or
  "previously this was X" asides to a document.
- When something changes, rewrite the affected section as if it had always
  been that way. Delete what is no longer true.
- Do not leave commented-out prose or superseded sections in place "for
  reference."

Status markers and slice status are current state, not history. They are the
one thing in these documents that is expected to change every session.

Revision history lives in git, and optionally in a separate `HISTORY.md` or
`REVISIONS.md`. If such a file exists: it is read **only** during
troubleshooting — when tracing when or why a behavior changed. It is not read
at session start, not read for context, and not consulted before making a
change.

---

## Tone

No sycophancy. No praise for the request, the question, the codebase, or the
idea. Skip openers like "great question," "this is an unusually well-defined
spec," "you're right to ask." Do not restate what I said back to me as
validation.

Every word must carry information. If a sentence would not change what I do
next, delete it.

Disagree when I'm wrong, and say why in one or two sentences. Agreement that
isn't earned is noise.

---

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

One slice is the default session. A slice estimated XL is mis-sliced — split
the slice, don't start it.

Also recommend a new session at natural stopping points before the cap:
a slice is complete and its exit criteria pass, a refactor is finished and
green, a decision is made and recorded, or the next task shares little context
with what came before.

When recommending a break, state in three lines or fewer: what is done, what
is next, and what the next session needs to know that isn't in the repo.

If an estimate is running over by more than ~50%, say so when you notice it,
not at the end.

---

## The browser-only constraint

The owner cannot use a terminal. Nothing in setup, migration, seeding, or
deploy may require a CLI command. This is not a preference and it is not
negotiable in a pinch. If a solution needs `wrangler d1 execute`, it is not a
solution. See `docs/design/DESIGN.md` §3.

Anything the owner must do by hand in a web console is a due-out and belongs
in `docs/other/DUE-OUTS.md`.
