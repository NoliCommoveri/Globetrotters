# Slice 11 — The merged draw

**Status:** built
**Band:** L
**Implements:** §4, §5 (two tables and a tier), §13 (nine focuses and their tag sets)
**Depends on:** 04, 09

**Goal.** Weeks 2 and 3 stop being two pools. Eight tasks are drawn from one pool against
tag weights, dealt four and four into the two weeks, and joined by the two pinned tasks —
so a month is twenty again and a focus is never absent from a whole week of paper.

This slice is the draw engine, its schema, and everything else that read the weights it
replaces. It is **not** the library it was designed for: `LIBRARY_v3.md` §2 holds 167
week 1–3 prompts and 61 of them are seeded. Slices 12 to 20 land the other 106 — the forms
and renderers first, because a binding points at a layout row that has to exist.

**So half of this slice's behaviour cannot be measured until 20.** That was not a reason
to wait — the engine is pure, and a pool is a pool — but it decided how it is tested. The
exit criteria below are in two lists: what a synthetic 153-row fixture proved here, and
what only the real library can prove, in 20.

---

## Due-outs

None. The draw never reads `country_focus_affinity`; the country card's recommendation
does, which is why **D-15 belongs to slice 22** and blocks nothing here. The three focuses
this slice seeds are pickable the day it lands and recommended when D-15 arrives.

## Open questions

None. Q-15 and Q-16 are answered and written into `../design/DESIGN.md` §4: one pool, and
the mode-tag rule is hard and scoped to **the month**, not the week.

One decision this slice makes rather than asks, because one option dominates.
`LIBRARY_v3.md` §7 asks whether `civic-process` should exist: its four prompts all carry
`governance` too, so People and Power weighting both at 3 pays twice for the same four
rows. **The tag stays and the weight goes** — it is honest documentation of what those
four prompts are, it costs nothing unweighted, and dropping the tag from People and
Power's set is reversible in a way that deleting it from four prompts is not.

## Build

### Schema — edited into `001_schema.sql`, not appended

`001` is edited in place and the database is rebuilt: **Erase everything**, Apply pending,
Run seed (§3). That is the whole reason the old shape of this slice — a `fixed` column
standing in for a tier SQLite will not add to a CHECK, `task_focus_weights` kept alive
because a drawn month is not re-derivable from tags — is gone. There is no data to
preserve. A schema change is an edit and three button presses.

```sql
CREATE TABLE prompt_tags (
  task_template_id INTEGER NOT NULL REFERENCES task_templates(id),
  namespace        TEXT    NOT NULL CHECK (namespace IN ('topic','mode')),
  tag              TEXT    NOT NULL,
  PRIMARY KEY (task_template_id, namespace, tag)
);
CREATE TABLE focus_tags (
  focus_id INTEGER NOT NULL REFERENCES focuses(id),
  tag      TEXT    NOT NULL,
  weight   INTEGER NOT NULL CHECK (weight BETWEEN 1 AND 3),
  PRIMARY KEY (focus_id, tag)
);
CREATE INDEX idx_prompt_tags_tag ON prompt_tags(namespace, tag);
CREATE INDEX idx_focus_tags_focus ON focus_tags(focus_id);
```

`namespace` is the topic/mode split. Mode tags never contribute weight and topic tags
never constrain the draw, so the two vocabularies must not share a column — a focus
weighting `us-contrast` at 3 would pull a quarter of the library at once
(`LIBRARY_v3.md` §3).

Three edits to existing DDL:

- `task_templates.tier` gains `'fixed'`: `CHECK (tier IN ('core','focus','wild','fixed'))`.
- `task_focus_weights` and `idx_weights_focus` are **deleted** from `001`, and its 87 rows
  from `002`. It is not kept in parallel: two sources of truth for what a focus favours
  means the focus editor edits something the draw ignores, which is worse than either.
- `SCHEMA_TABLES` in `src/lib/migrations.js` and `SEEDED_TABLES` in `src/lib/seed.js`
  follow — both lists are hand-maintained and the health page reads them.

**`learner_prompt_log` is not built.** `plan_tasks` joined to `month_plans` already answers
*when did this person last draw this*, `drawInputs` reads it that way, and a log written at
draw time would record prompts a redraw then threw away and cool them down for nothing. It
was in this slice's first draft as a table the same draft argued against building. It is
one join; if it ever shows up hot, it is an index.

### Seed — `002_seed.sql`, edited in place

**Nine focuses.** Three are new rows: `who-lives-here`, `who-gets-what`,
`stories-and-spirits`. The first is not a `LIBRARY_v3` invention — it is named in
`DESIGN.md` §4 and was simply never seeded, and like the other two it has no
`country_focus_affinity` rows, which is why D-15 is three focuses and not two.

**`focus_tags`** — the nine tag sets from `LIBRARY_v3.md` §3's focus table, 65 rows, less
`civic-process` from People and Power.

**`prompt_tags`** — the `tags:` and `mode:` lines from `LIBRARY_v3.md` §2 for the 61 week
1–3 prompts seeded, 145 topic rows and 32 mode rows. Slices 16 to 20 add the rest as they
add the prompts they belong to; a prompt and its tags are never separated, because an untagged
prompt is drawn at baseline forever and nothing reports it.

No `personal-voice` row is among them: all eight prompts carrying that mode are in slices
16 to 20, and the two Voices prompts land in 20.
The repair budget falls back to an ordinary wildcard when a mode has no candidate, so the
month rule is satisfied by `cook-it`'s `hands-on` alone until the voices land.

**Two pins.** `wow-fact` becomes tier `fixed`. **`cook-it` is seeded here** — the one
prompt this slice writes, and it is structural rather than content: without it week 3 has
no pin and the deal has no four-and-four to make. It lands with no worksheet binding, so
it prints its prompt over ruled lines (`FALLBACK_LAYOUT`) until slice 15 writes the
`recipe` renderer. That is the state `004_worksheets.sql` was designed for.

`workbook_page` stays on the row and is not read by the draw.

### The engine — `src/lib/draw.js`

`drawDeepWeek` is replaced by one draw of eight and a deal. The deal is pure — it takes
ten prompts and returns two lists — so it is the piece to write and test first. It lives
in `draw.js` as `dealWeeks`, not in a `deal.js`: `public/js/deal.js` is already the
country shuffle, and two files called deal is one too many.

1. **Weight.** `fw = 1 + 2 * SUM(focus_tags.weight)` over the template's shared *topic*
   tags. Mode tags never contribute. The `1 +` floor is the no-zeros rule: a template with
   no overlap is still reachable.
2. **Cooldown.** `recency = 0` if this person drew it within 3 months, else 1. Per person,
   so a prompt rests for one child and stays available to a sibling. If it ever empties the
   pool, put the single stalest cooldown template back rather than erroring.
3. **The eight.** Six by weighted selection without replacement, then two wildcards drawn
   uniformly from the bottom quarter by `fw` of what is left — the quarter recomputed
   after the first wildcard, so the second is not drawn from a set the first has left.
   Two constraints inside the loop, both capped at two and both counting the pins from
   the start: no worksheet form may take more than two of the ten seats (a template with
   no binding counts as no form), and no mode tag may take more than two. The mode cap is
   two rather than one because `cook-it` is pinned and carries `hands-on` — at one it
   spent that tag before the draw began.
4. **Mode balance, and it is the half the first draft of this slice dropped.** The ten must
   hold at least one `hands-on` and at least one `personal-voice` prompt. `LIBRARY_v3.md`
   §3 calls this the only mechanism guaranteeing a month is not one in which nobody from
   the country ever speaks, and the anti-monotony rule does not deliver it. **The two
   wildcard slots are the repair budget**: if the six weighted picks hold no `hands-on`,
   the first wildcard draws from `hands-on` candidates only; the second does the same for
   `personal-voice`. Both already unfilled and both mode tags already taken cannot happen —
   the month rule means a taken mode tag is a prompt that carries it.
5. **The deal.** Take the eight, enumerate all 70 four-four splits, score each on
   (form collision inside a week, `fw` imbalance, arc violation, paper imbalance) and take
   the lexicographic minimum. The second key is the **summed** `fw` of each side, not a
   count of the prompts above baseline — a count treats one weight-1 tag as worth a ×9 and
   gives back a third of what the merged pool buys. `wow-fact` joins week 2's four,
   `cook-it` week 3's. `nations-before-the-throne` and `hear-from-a-kid` are barred from
   week 2 — both say *this month* in their wording. Neither is seeded until slices 19 and
   20, so the rule matches nothing until then and is written against the slug either way.

`plan_tasks.week_no` still holds 2 or 3 and `position` still orders within a week. Nothing
downstream of the draw changes: This week, Plan, Passport, the wall and the worksheet
route all read the same rows.

### Everything else that read the weights

The draw is not the only consumer, and this is the half that set the band. Six modules
read `task_focus_weights` and all of them moved to the tag join:

- `src/api/plans.js` — `drawInputs`'s weight lookup becomes the tag join; the focus-change
  path in `apiPatchPlan` redraws weeks 2 and 3 as **one** draw instead of two.
- `src/api/tasks.js` — the swap pool, below.
- `src/api/focuses.js` — `GET /api/focuses/:id/samples` returns the three highest `fw`,
  alternating natural week 2 and week 3 so the preview shows both halves of a month
  (Q-06), and the count beside them is named `above_baseline`, which is what it is.
- `src/admin/focuses.js` — the library editor's focus tab, the largest of the five. The
  grid is the topic vocabulary at a 0–3 weight, not 153 prompts, which is a smaller and
  more honest screen — and it is the screen that makes a new tag reachable without a
  deploy. `POOL_FLOOR` went with the weights: there is no weight-0 any more, so nothing
  on this screen can shrink the pool, and the one warning left is a focus whose tags
  match no prompt at all.
- `src/admin/library-api.js` — the backup export and import carry the two tag lists
  instead of weights, at file version 2, and the version check refuses a version 1 file
  rather than restoring a library with no focus opinions in it.
- `src/lib/seed.js`, `src/lib/migrations.js` — the two hand-maintained table lists.

### Swap

The swap pool for a week-2 or week-3 task is the whole merged pool rather than that task's
week. It respects the form cap against the nine tasks still on the plan, and it will not
put a second copy of a form into the week it is swapping inside — §4 forbids that outright
and a swap is a draw. It is refused on tier `fixed`: `swappable()` in `src/api/plans.js`
already refused week 4 and week 1's four `core`, and `fixed` joins them.

Mode tags are **not** checked on swap. The anti-monotony rule is scoped to the draw, and
refusing one of a parent's three swaps over a second `us-contrast` costs more than the
repeat does.

## Exit criteria

All of these pass. They run against a synthetic fixture in `test/draw.test.js` that
mirrors `LIBRARY_v3.md`'s shape — 153 drawable rows, the same twenty-seven forms in the
same proportions, 50 topic and 7 mode tags — and against the real seeded library, which is
the same 153 now that slice 20 has landed. The suite is 357 tests.

- A drawn month has twenty tasks: 5 / 5 / 5 / 5.
- Week 2 contains `wow-fact`, week 3 contains `cook-it`, and neither is swappable.
- No worksheet form appears twice inside one week, and no form takes more than two of the
  ten, in a thousand consecutive drawn months.
- No mode tag takes more than two of one month's ten. The cap counts the pins, and it is
  two rather than one because `cook-it` carries `hands-on`: at one, the pin spent the tag
  before the draw began and the library's other seven `hands-on` prompts were unreachable.
- Every drawable prompt in the real library can actually be drawn — 2,250 months per
  focus, no prompt left out.
- Every month holds at least one `hands-on` and at least one `personal-voice` prompt.
  `hands-on` is structural, since `cook-it` carries it. `personal-voice` holds in all but
  about one month in nine hundred over nine-month runs against the real library, where the
  `lines-4` form cap leaves the repair no candidate; the draw falls back rather than
  failing.
- A template drawn by a person in month *m* is not drawn for that person again before
  month *m+4*, and is still available to a sibling in month *m+1*.
- Nine months back to back never reach the stalest-back cooldown fallback: across 32,400
  simulated months the fresh pool never fell below 129 against the eight a draw needs.
- Swap on a week-2 task can return a template whose `week_theme` is 3.
- The focus tab writes a tag weight, and the next draw reflects it with no deploy.
- Erase everything, Apply pending, Run seed rebuilds the database and a month draws.

## Do not build

New prompts other than `cook-it`. New forms, new renderers, the `recipe` renderer,
`country_focus_affinity` rows, and the twelve prompts Ancient World and Conflict and
Change still owe. All of it is slices 12 to 22. This slice makes the draw able to use it.
