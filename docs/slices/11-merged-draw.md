# Slice 11 — The merged draw

**Status:** not started
**Band:** L
**Implements:** §4, §5 (three tables), §13 (nine focuses)
**Depends on:** 04, 09

**Goal.** Weeks 2 and 3 stop being two pools. Eight tasks are drawn from one
153-template pool against tag weights, dealt four and four into the two weeks, and
joined by the two pinned tasks — so a month is twenty again and a focus is never
absent from a whole week of paper.

This slice is the draw engine and its schema. It does **not** write prompts, forms or
renderers; `LIBRARY_v3.md` §6 sequences those separately.

---

## Due-outs

- **D-15** `country_focus_affinity` rows for `who-gets-what` and `stories-and-spirits` —
  roughly twenty countries each with a one-line reason. **Outstanding.** Blocks the two
  new focuses from being recommended on a country card, not from being pickable. Build
  the rest of the slice and seed the two focuses without affinities if D-15 is still open.

Nothing else. Everything else this slice reads exists after slice 09.

## Open questions

None open. Two that were open in `LIBRARY_v3.md` §7 are answered and written into §3
there: the mode-tag anti-monotony rule is **hard**, not soft (it cannot deadlock against
a 153-pool — zero fallbacks in 40,000 simulated draws), and the weight scale is
**`1 + 2 × Σw`**, not `1 +`.

## Build

### Schema

Three new tables, all additive, plus one column.

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
CREATE TABLE learner_prompt_log (
  person_id        INTEGER NOT NULL REFERENCES people(id),
  task_template_id INTEGER NOT NULL REFERENCES task_templates(id),
  drawn_on         TEXT    NOT NULL,
  PRIMARY KEY (person_id, task_template_id, drawn_on)
);
```

`namespace` is the topic/mode split and has to exist from the first insert — adding it
later re-tags 167 rows.

**The `fixed` tier needs a column, not a tier.** `task_templates.tier` is a CHECK
constraint inside a migration that has already applied and SQLite cannot alter a CHECK, so
a new tier value means a table rebuild. `ALTER TABLE task_templates ADD COLUMN fixed
INTEGER NOT NULL DEFAULT 0` does the same job in one statement. Two rows set it:
`wow-fact` and `cook-it`.

`learner_prompt_log` is not strictly new information — `plan_tasks` joined to
`month_plans` already answers "when did this person last draw this" and `drawInputs` reads
it that way today. Keep reading it that way; the table earns its place only if the join
shows up hot, and it is one row per person per task per month either way.

`task_focus_weights` stays until every focus has `focus_tags` rows, then stops being read.
Do not drop it in this slice — a month already drawn is not re-derivable from tags.

### The engine

`src/lib/draw.js` runs once for weeks 2–3 instead of twice. Four pieces, and the deal is
the one to write and test first because it is pure.

1. **Weight.** `fw = 1 + 2 * SUM(focus_tags.weight)` over the template's shared *topic*
   tags. Mode tags never contribute weight. The `1 +` floor is the no-zeros rule: a
   template with no overlap is still reachable.
2. **Cooldown.** `recency = 0` if this person drew it within 5 months, else 1. Per person.
   If it ever empties the pool, put the single stalest cooldown template back rather than
   erroring.
3. **The eight.** Six by weighted selection without replacement, then two wildcards drawn
   uniformly from the bottom quarter by `fw` of what is left. Two constraints inside the
   loop: no worksheet form may take more than two of the ten seats (the pins count from
   the start), and no mode tag may appear twice in the month.
4. **The deal.** Take the eight, enumerate all 70 four-four splits, score each on
   (form collision inside a week, `fw` imbalance, arc violation, paper imbalance) and take
   the lexicographic minimum. The second key is the **summed** `fw` of each side, not a
   count of the prompts above baseline — a count treats one weight-1 tag as worth a ×9 and
   gives back a third of what the merged pool buys. `wow-fact` joins week 2's four, `cook-it` week 3's.
   `nations-before-the-throne` and `hear-from-a-kid` are barred from week 2 — both say
   *this month* in their wording.

`plan_tasks.week_no` still holds 2 or 3 and `position` still orders within a week. Nothing
downstream of the draw changes: This week, Plan, Passport, the wall and the worksheet
route all read the same rows.

### Swap

The swap pool for a week-2 or week-3 task becomes the whole merged 153 rather than that
task's week. It must respect the form cap against the nine tasks still on the plan, and it
is refused on the two `fixed` rows.

## Exit criteria

- A drawn month has twenty tasks: 5 / 5 / 5 / 5.
- Week 2 contains `wow-fact`, week 3 contains `cook-it`, and neither is swappable.
- No worksheet form appears twice inside one week, in a thousand consecutive drawn months.
- No mode tag appears twice in one month's weeks 2–3.
- A template drawn by a person in month *m* is not drawn for that person again before
  month *m+6*, and is still available to a sibling in month *m+1*.
- Nine months drawn back to back for one person against one focus put an on-theme task in
  every week for seven of the nine focuses; Ancient World and Conflict and Change may
  still miss until their twelve prompts are written (`LIBRARY_v3.md` §7).
- Swap on a week-2 task can return a template whose `week_theme` is 3.

## Not in this slice

New prompts, new forms, new renderers, and the twelve prompts Ancient World and Conflict
and Change still owe. This slice makes the draw able to use them.
