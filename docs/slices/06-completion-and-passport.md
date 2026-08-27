# Slice 06 — Completion, stamp, passport

**Status:** not started
**Band:** M
**Implements:** §7 Passport, §11 (the stamp)
**Depends on:** 05

**Goal.** The signature moment, and the artifact the year produces.

**This is the ship point.** At the end of this slice the app does the whole
nine-month job for one person on one phone.

---

## Due-outs

- **D-13** Where the printed passport goes — paper size, and whether it prints
  to one sheet. §7 specs a print stylesheet for the page that goes in the front
  of the binder in June.

## Open questions

None outstanding, provided Q-09 (below) is settled with the wall in slice 07.

## Build

- **Completion is a consequence, not a button.** Gate it on 20 of 20 and let
  the last check-off offer it: "That's twenty. Ready to stamp Peru?" A
  completion button sitting in a corner all month gets tapped in week two and
  burns the stamp.
- **Accepting routes to `/passport`, and the stamp lands there.** The offer
  appears on a task card; the stamp lives on the passport. Otherwise the app's
  signature moment plays on the wrong canvas, or is missed entirely by a kid
  who taps through later to an already-stamped grid.
- `POST /api/plans/:id/complete` — gated on 20/20, writes the stamp with
  `person_id`, `country_id`, `focus_id` denormalized from the plan. A stamp is
  a frozen record of what was earned, not a live view.
- **The headline is chosen, not composed.** At completion, show the month's
  session notes and pick one. A kid asked to summarize a month cold, at the
  moment they most want to be done, writes "it was fun." If no notes were
  written all month — the prompt is skippable twenty times — fall back to
  picking from the twenty completed task titles. It may also stay null.
- `PATCH /api/stamps/:id` — the headline is **editable afterwards from the
  passport**. It is the permanent text on the year's artifact and it is chosen
  at the single moment of least care, the tap that ends the month.
- `DELETE /api/plans/:id/complete` — a confirm step, not typed. It destroys an
  earned stamp, there are no roles, and it is the only destructive control
  outside `/admin`.
- `GET /api/passport` — all stamps, all people, plus the empty grid shape

### The passport

- **Draw the whole year from day one.** Three columns, nine rows, Sep–May, as
  blank stamp slots. An unfilled passport is a far stronger invitation than an
  absent one: it shows the shape of the goal in September and makes the full
  page something you can see coming for nine months.
- **The current month's slot is not blank.** In October, September's slot is
  stamped and October's would otherwise look identical to May's — throwing away
  the one piece of live state the family screen could carry. An in-progress
  slot shows the country name without a stamp; an unstarted one says so. That
  puts "who hasn't started yet" on every phone instead of only on the wall.
- **The stamp carries the person and the focus.** "Ana · Peru · October · Wild
  Places". The focus records *how* they studied it, which is the whole premise
  of the focus system and a free join. The name is there because ink is not a
  reliable ownership signal: column position carries it on the grid, but the
  wall's full-screen stamp has no column, and a home printer renders all three
  inks as the same grey.
- Duplicate countries across people are allowed and are not deduped. Two Japans
  in two different inks is a good artifact.
- **The stamp face:** person, country, month, focus, slight random rotation and
  offset, in that person's ink. This is the only place motion is allowed.
- **It lands once per viewer** — a watermark against `earned_at` — rather than
  once ever. The phone that earned it, the wall in the kitchen, and the other
  two people on next open each get the moment exactly one time.
- **Printable.** A print stylesheet on `/passport`. In June there are 27 stamps
  and the year is over.

## Exit criteria

- An empty passport in September looks like an invitation, not an error
- The twentieth check-off carries you to a stamp landing on the grid
- Reloading `/passport` does not replay the animation
- The current month's slot shows an in-progress country, and an unstarted
  person says so
- Un-completing asks first and removes the stamp; re-completing re-stamps
- `prefers-reduced-motion` cross-fades instead of animating
- The page prints with all three inks legible in grey

## Do not build

- The wall's copy of any of this. Slice 07 has its own type scale, its own
  watermark storage, and its own queueing.
- R2 photo upload. The `media` table exists; the bucket, the binding and the UI
  all arrive together with the feature, and none of them is in v1.
