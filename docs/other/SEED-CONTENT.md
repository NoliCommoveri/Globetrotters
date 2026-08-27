# Seed content

The five hand-written lists in the seed files — countries, task templates and
focus weights in `002_seed.sql`, hooks and focus affinities in
`003_country_data.sql` — and the rules a row has to satisfy. All five are
complete: 195 countries, 90 templates, 87 weights, and 222 hooks and 200
affinities across 100 countries. This is the reference for **adding** to them.

Each list sits between a `-- BEGIN x` / `-- END x` pair in its file. Rows go
inside the markers in the form below and nothing else changes. Nothing here
needs a terminal: edit the file in the GitHub web editor, wait for the build,
then press **Run seed** on `/admin`. A press adds the new rows and leaves every
existing one exactly as it is — the inserts are `ON CONFLICT DO NOTHING`, except
the hooks, which are guarded on the country instead and are the one list with a
rule of its own. See **Country data** below.

**Two SQL rules, and they are the only ones.**

- An apostrophe inside a value is doubled: `Côte d''Ivoire`, `what''s carved`.
- Rows are separated by a comma; the last row in a block ends with no comma,
  because the block's closing line supplies the `ON CONFLICT`.

---

## Countries

195 rows, complete. `iso3` is the stable key — the seed matches on it, so a name can be
corrected later without creating a duplicate.

| Column | Rule |
|---|---|
| `name` | What a 5th grader would write on a workbook page. `Vietnam`, not `Socialist Republic of Viet Nam`. |
| `iso3` | ISO 3166-1 alpha-3, uppercase. Unique. `USA`, `DEU`, `CIV`. |
| `continent` | One of exactly: `Africa` `Asia` `Europe` `North America` `South America` `Oceania` |
| `region` | Your own grouping, used to break a continent into browsable chunks. Reuse the same spelling across rows or the picker shows two groups. Nullable — write `NULL` unbracketed if a country has none. |
| `research_depth` | `1` lots to find · `2` some digging · `3` you'll have to hunt. This is the adventure level, and it is the one column that prevents a demoralizing month. Be honest: most of Oceania and the small Caribbean states are 3. |

Paste-ready form — one row per line:

```sql
-- BEGIN countries
  ('Peru', 'PER', 'South America', 'Andean', 1),
  ('Iceland', 'ISL', 'Europe', 'Northern Europe', 1),
  ('Côte d''Ivoire', 'CIV', 'Africa', 'West Africa', 2),
  ('Tuvalu', 'TUV', 'Oceania', 'Polynesia', 3)
-- END countries
```

A spreadsheet works too if that is easier to write in: five columns in that
order, and a build session turns it into the rows above.

---

## Task templates

**90 rows**, distributed exactly.

| Week | Rows | What they are |
|---|---|---|
| 1 | 10 | 4 `core` — flag, map, location/borders, language & writing system — always drawn. Plus 6 that compete for the 5th slot: stats, symbols, currency, time, size, anthem. |
| 2 | 25 | History, government, law, land, climate, ecology, farming, trade, prehistory. Five are drawn; the twenty spare are what makes Swap and a nine-month year work. |
| 3 | 25 | People, religion, daily life for kids and women, food, art, music, sport, wow facts, landmarks. Same: five drawn, twenty spare. |
| 4 | 30 | Five for each of the six project types, in order: choose · gather · build · build · rehearse & present. |

All six project types carry a full sequence, so setup offers all six. A project
type created in the editor stays hidden until its five week-4 rows are written.

Twenty-seven is the smallest seed that lets weeks 2 and 3 be drawn *and*
swapped — but that number sizes the pool for the **draw**, and the draw is not
what runs out. Five tasks come out of a week however many are in it, so a
deeper pool costs the kid nothing at all and only buys variety.

What runs out is a **focus**. A focus with two on-theme tasks in a week draws
both of them every month it is chosen, and these get chosen nine times. Against
a 25-task week the floor is **six** on-theme tasks per focus per week: three
would put barely one of them in a draw of five, while six put two or three.
`test/seed-content.test.js` asserts it.

**Five templates carry the family's Sabbath and Kingdom lens** — two in week 2,
three in week 3 (DESIGN.md §13). A new one is written the same way the other
eighty-five are: one action, ten minutes, second person, and it has to work in
Peru and in Japan. A scripture reference is the one thing a prompt may assert,
because a citation can be checked; whatever the kid is asked to find stays a
lead.

| Column | Rule |
|---|---|
| `slug` | Stable key, lowercase, hyphens: `currency-animal`. The seed matches on it, so a title can be reworded later without creating a duplicate. Never reuse a slug for a different task. |
| `title` | The card face. Imperative, ≤ 6 words. `Draw and color the flag`. |
| `prompt` | **The whole point.** Second person, to a 5th grader, one clear action, finishable in ten minutes. `Find out which animal is on their money and draw it` — never `Research national symbolism`. It must work in Peru and in Japan without editing: no task is country-specific. |
| `week_theme` | `1`–`4`. |
| `workbook_page` | Which physical page this feeds: `flag` `map` `language` `symbols` `money` `history` `government` `land` `ecology` `people` `food` `culture` `project`. Invent one if a task needs it; reuse the spelling. Nullable. |
| `tier` | `core` fixed and always included (week 1's four, and all five week-4 rows) · `focus` the weighted draw pool (weeks 2 and 3) · `wild` eligible but off the main line (week 1's fifth-slot candidates). |
| `project_type` | The project type's **slug** on week-4 rows, `NULL` on every other row. A `LEFT JOIN` in the file resolves it to an id, so a row never names an id this file cannot know. A slug that matches nothing silently yields `NULL` — `test/seed-content.test.js` catches that. |
| `position` | `1`–`5` on week-4 rows, `NULL` elsewhere. This is the sequence order. |

Paste-ready form:

```sql
-- BEGIN task_templates
  ('flag-draw', 'Draw and color the flag',
   'Find your country''s flag and copy it into your workbook. Get the colors right, then write one line about what you think the colors are for.',
   1, 'flag', 'core', NULL, NULL),

  ('currency-animal', 'What is on their money?',
   'Find a picture of their money. Which animal, plant or person is on it? Draw it, and write who they are.',
   1, 'money', 'wild', NULL, NULL),

  ('trifold-choose', 'Plan your three panels',
   'Your board has three panels. Decide what goes on each one and sketch the plan on a scrap of paper first.',
   4, 'project', 'core', 'trifold-board', 1)
-- END task_templates
```

---

## Focus weights

87 rows. Sparse: a task with no row for a focus is neutral. Only write a row where a
focus has an opinion.

- `3` — on theme. This focus should reach for this task.
- `0` — excluded. This focus should never draw it.

**Every one of the six focuses needs at least six `3`s in week 2 and six in
week 3.** Per week, because the draw runs per week: a focus with an opinion
about week 2 and none about week 3 leaves week 3 exactly as it would be with no
focus chosen. Six rather than three, because three on-theme tasks in a 25-task
pool put barely one of them in a draw of five — and the whole point of a focus
is that the five tasks feel like the thing you picked.

A task can carry a `3` for more than one focus, and many do: `landforms` is
on theme for both `land-and-sky` and `food-and-craft`. That is how fifty tasks
cover seventy-two focus-weeks.

**At most one `0` per focus per week.** Exclusions eat the spare that swap draws
from. The rule held when the weeks were 8, and again at 13, and it stays at one
now they are 25 — a bigger pool is headroom for content, not for exclusions.

Paste-ready form — task slug, focus slug, weight:

```sql
-- BEGIN task_focus_weights
  ('ancient-ruins',  'ancient-world',       3),
  ('wild-animal',    'wild-places',         3),
  ('who-decides',    'people-and-power',    3),
  ('dinner-tonight', 'food-and-craft',      3),
  ('map-of-then',    'conflict-and-change', 3),
  ('landforms',      'land-and-sky',        3),
  ('who-decides',    'food-and-craft',      0)
-- END task_focus_weights
```

The six focus slugs, fixed: `ancient-world` `wild-places` `people-and-power`
`food-and-craft` `conflict-and-change` `land-and-sky`

The six project type slugs, fixed: `trifold-board` `model-or-diorama` `video`
`skit` `museum-box` `illustrated-zine`

---

## Country data

`003_country_data.sql`, and the two lists in it. 100 countries carry hooks and
affinities; the other 95 are selectable and unadorned, which is the intended
state and not a gap to fill (DESIGN.md §9).

### Hooks

2 or 3 a country. The hook is the sentence that makes a kid stop scrolling, and
position 1 is the one the picker shows.

| Column | Rule |
|---|---|
| `iso3` | The country, by ISO3. A code matching no country contributes no row and raises no error — `test/country-data.test.js` counts the block against what landed. |
| `text` | **A lead, never a fact.** Opens with `Find out`, `Look up` or `Find`, and no full stop at the end. 30–140 characters. |
| `position` | `1`, `2`, `3`. Position 1 is the strongest of them. |

**Why the phrasing rule is absolute.** A few hundred hooks written by hand will
contain errors, and the phrasing decides what an error costs. A lead that is
wrong sends a kid on a dead-end search; an assertion that is wrong gets copied
into a workbook as a false sentence. It is also the better lesson: the app
points, the kid finds.

```sql
-- BEGIN country_hooks
  ('PER', 'Find out what is carved into the desert at Nazca that you can only see from the air', 1),
  ('ISL', 'Find out where Iceland is splitting in two, and how fast the two halves are moving apart', 1),
  ('ISL', 'Look up how Iceland heats its houses without burning anything', 2)
-- END country_hooks
```

**A hook added here for a country that already has hooks will not land.** The
insert skips any country already holding one, because `country_hooks` has no
natural key to conflict on and a hook deleted in the editor has to stay deleted.
Adding a hook to an already-seeded country is done in the library editor. Adding
a *new country* to this list works normally.

### Focus affinities

2 or 3 a country. Recommendations only — there is no way to say "bad fit", and
there should not be: any focus is allowed on any country, and the app's job is
to say what is good about a choice rather than argue with it.

| Column | Rule |
|---|---|
| `iso3` | The country. |
| `focus` | One of the six focus slugs. |
| `score` | `3` exceptional fit · `2` good fit. Nothing else exists. |
| `reason` | Kid-facing, 15–90 characters, no full stop. It is shown under the focus name on setup, so it has to read out loud in one breath. `you'll have more to draw than fits on the page`. |

Keyed on `(country_id, focus_id)`, so this list takes the ordinary
`ON CONFLICT DO NOTHING` and can be extended for any country at any time.

```sql
-- BEGIN country_focus_affinity
  ('EGY', 'ancient-world', 3, 'you''ll have more to draw than fits on the page'),
  ('ISL', 'land-and-sky',  3, 'the ground is still being built')
-- END country_focus_affinity
```

### Adventure level

The file ends with one `UPDATE` correcting `research_depth` where writing a
country's hooks proved the first pass wrong. It is the one library column a seed
may revise, because it is the one nothing else writes — the editor does not
expose it, so the update cannot overwrite anyone's work and the second press
changes nothing. Down means more kid-findable material than credited; up is the
direction that matters, because a `1` promises "lots to find" and a country where
an 11-year-old will hit twenty dead ends must not carry that promise.

---

## How the blocks are wired

Both the templates and the weights blocks are joined to their lookup tables on a
slug, so a row names `trifold-board` rather than an id. Two mechanics in the
file make that work, and neither affects how a row is written:

- A header row — `SELECT NULL AS slug, ... WHERE 0` — names the columns. SQLite
  has no `AS v(a, b, c)` syntax, and without the header the join would have to
  reach for `column1`.
- `WHERE true` sits before `ON CONFLICT`. On an `INSERT ... SELECT` the parser
  otherwise reads `ON` as the start of another join constraint.

The weights block uses an inner join, so a mistyped task or focus slug
contributes no row and raises no error. That is the one silent failure mode
here, and it is why `test/seed-content.test.js` counts the rows in each block
against the rows that landed.

## Changing a row that is already seeded

You can't, from this file — a press will not touch it. Use the library editor
(slice 08), or add a new seed file. That is the deliberate trade: the same rule
that lets these blocks grow is the rule that protects an edit you made in the
app.
