# Seed content

The three hand-written lists in `002_seed.sql` — countries, task templates,
focus weights — and the rules a row has to satisfy. Seed v0 is complete: 195
countries, 27 templates, 22 weights. This is the reference for **adding** to
them, which is what slice 09 does.

Each list sits between a `-- BEGIN x` / `-- END x` pair in
`src/migrations/002_seed.sql`. Rows go inside the markers in the form below and
nothing else changes. Nothing here needs a terminal: edit the file in the GitHub
web editor, wait for the build, then press **Run seed** on `/admin`. Every
insert is `ON CONFLICT DO NOTHING`, so a press adds the new rows and leaves
every existing one exactly as it is.

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

**27 rows in v0**, distributed exactly. Slice 09 takes this to ~90 — 10 in week
1, 25 in week 2, 25 in week 3, and 5 per project type in week 4.

| Week | Rows | What they are |
|---|---|---|
| 1 | 6 | 4 `core` — flag, map, location/borders, language & writing system — always drawn. Plus 2 more that compete for the 5th slot. |
| 2 | 8 | History, government, land, climate, ecology, prehistory. Five are drawn; the three spare are what makes Swap work. |
| 3 | 8 | People, religion, daily life, food, art, music, sport, landmarks, wow facts. Same: five drawn, three spare. |
| 4 | 5 | The `trifold-board` sequence, in order: choose · gather · build · build · rehearse & present. |

The other five project types get no week-4 rows in v0 and stay hidden in setup
until they are filled. That is deliberate — 27 is the smallest seed that lets
weeks 2 and 3 be drawn *and* swapped.

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

22 rows in v0. Sparse: a task with no row for a focus is neutral. Only write a row where a
focus has an opinion.

- `3` — on theme. This focus should reach for this task.
- `0` — excluded. This focus should never draw it.

**Every one of the six focuses needs at least one `3` in week 2 and at least one
in week 3.** The draw runs per week: a focus with an opinion about week 2 and
none about week 3 leaves week 3 exactly as it would be with no focus chosen, and
the focus preview in setup has half as much to show.

**At most one `0` per focus per week.** Week 2 and week 3 hold 8 tasks each and
5 are drawn; a second exclusion leaves swap with no candidate.

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
