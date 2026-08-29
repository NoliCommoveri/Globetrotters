# Seed content

The six hand-written lists in the seed files — countries, task templates, prompt tags
and focus tags in `002_seed.sql`, hooks and focus affinities in
`003_country_data.sql` — and the rules a row has to satisfy. All six are
seeded: 195 countries, 91 templates, 177 prompt tags, 65 focus tags, and 222 hooks and
200 affinities across 100 countries. This is the reference for **adding** to them, which
is what slices 16 to 20 do 106 more times.

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

**91 rows**, distributed exactly.

| Week | Rows | What they are |
|---|---|---|
| 1 | 10 | 4 `core` — flag, map, location/borders, language & writing system — always drawn. Plus 6 that compete for the 5th slot: stats, symbols, currency, time, size, anthem. |
| 2 | 26 | History, government, law, land, climate, ecology, farming, trade, prehistory, plus the pinned `wow-fact`. |
| 3 | 25 | People, religion, daily life for kids and women, food, art, music, sport, landmarks, plus the pinned `cook-it`. |
| 4 | 30 | Five for each of the six project types, in order: choose · gather · build · build · rehearse & present. |

**The week column is the prompt's natural half, not a draw pool.** Weeks 2 and 3 are
one pool of 51 — 49 drawable and the two pins — and eight come out of it and are dealt
four and four. Nothing in the draw reads `week_theme`; only the deal's arc preference
does, which leans a natural week 2 toward the earlier week when nothing more important
is at stake (DESIGN.md §4).

All six project types carry a full sequence, so setup offers all six. A project
type created in the editor stays hidden until its five week-4 rows are written.

Eight drawable prompts is the smallest pool the merged draw will take, and one project
type's five is the other floor — but those numbers size the pool for the **draw**, and
the draw is not what runs out. Ten tasks come out of the merged pool however many are
in it, so a deeper pool costs the kid nothing and only buys variety.

What runs out is the **cooldown**. A prompt drawn for a learner rests five months, and
eight a month against 49 drawable blocks forty by month six — at which point the
stalest-back fallback stops being a safety valve and becomes the mechanism. The number
is sized for the 153 `LIBRARY_v3.md` §2 specifies, and closing that gap is the whole of
slices 12 to 20.

**Five templates carry the family's Sabbath and Kingdom lens** — two in week 2,
three in week 3 (DESIGN.md §13). A new one is written the same way the other
eighty-six are: one action, ten minutes, second person, and it has to work in
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
| `tier` | `core` always included (week 1's four, and all five week-4 rows) · `focus` the merged weeks 2–3 pool the draw weights · `wild` eligible but off the main line (week 1's fifth-slot candidates) · `fixed` a pinned prompt, never weighted, cooled down or swapped. Only `wow-fact` and `cook-it` are `fixed`, and a third would make a week six tasks. |
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

## Prompt tags

177 rows over the 61 seeded week 1–3 prompts — 145 `topic` and 32 `mode`. **A prompt
and its tags are written in the same edit, always.** An untagged prompt is drawn at
baseline forever and nothing reports it, so `test/seed-content.test.js` fails on one
rather than letting it through.

`topic` is what the prompt is about, and it is the only namespace a focus can weight.
Two to four a prompt. The vocabulary is the fifty tags in `../design/LIBRARY_v3.md` §3,
and a new one is legitimate — weight it on the focus tab and it is live on the next
draw, with no deploy.

`mode` is how the kid produces the answer, and it carries no weight at all. Zero to two
a prompt, from seven fixed names: `us-contrast`, `demographics-stat`, `measurement`,
`hands-on`, `map-work`, `personal-voice`, `scripture-read`. They do two jobs the topic
tags cannot — no month draws two prompts sharing one, and every month holds at least
one `hands-on` and one `personal-voice`. **An eighth name is not a new mode, it is a
rule that silently stops applying**, so the test refuses one.

The two namespaces must never share a vocabulary. `us-contrast` reaches a quarter of the
finished library; a focus allowed to weight it at 3 would pull a quarter of the pool in
one move.

Paste-ready form — task slug, namespace, tag:

```sql
-- BEGIN prompt_tags
  ('first-people',      'topic', 'deep-time'),
  ('first-people',      'topic', 'empire-and-rule'),
  ('how-many-people',   'topic', 'city-life'),
  ('how-many-people',   'mode',  'demographics-stat'),
  ('how-many-people',   'mode',  'us-contrast')
-- END prompt_tags
```

---

## Focus tags

65 rows over nine focuses, from `../design/LIBRARY_v3.md` §3's focus table. Sparse: a
tag with no row is no opinion. A focus declares which **tags** it cares about, never
which prompts, which is what lets a prompt written next year self-onboard — tag it once
and every focus with a matching affinity draws it correctly.

- `3` — this focus is about that tag.
- `2` — it reaches for it.
- `1` — it will take it.
- no row — no opinion.

**There is no `0` and no way to exclude.** The draw scores a prompt at
`fw = 1 + 2 × SUM(weight)` over the tags it shares, so every prompt is reachable by
every focus and nothing typed here can starve the pool. What can go wrong is the
opposite: a focus whose tags match no prompt draws exactly what picking nothing would.
`test/seed-content.test.js` holds a floor of six prompts lifted above baseline per
focus, which is a smoke check against a mistyped tag set rather than a target — the
target is `LIBRARY_v3.md` §3's ten on-theme prompts, and slices 16 to 21 reach it.

**People and Power does not weight `civic-process`.** All four of its prompts carry
`governance` too, so weighting both pays twice for the same four rows. The tag stays on
those prompts as documentation of what they are.

Paste-ready form — focus slug, tag, weight:

```sql
-- BEGIN focus_tags
  ('ancient-world',     'deep-time',           3),
  ('ancient-world',     'empire-and-rule',     3),
  ('ancient-world',     'extinction',          1),
  ('wild-places',       'wildlife',            3)
-- END focus_tags
```

The nine focus slugs, fixed: `ancient-world` `wild-places` `people-and-power`
`food-and-craft` `conflict-and-change` `land-and-sky` `who-lives-here`
`who-gets-what` `stories-and-spirits`

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

Every block is joined to its lookup table on a slug, so a row names `trifold-board` or
`first-people` rather than an id. Two mechanics in the file make that work, and neither
affects how a row is written:

- A header row — `SELECT NULL AS slug, ... WHERE 0` — names the columns. SQLite
  has no `AS v(a, b, c)` syntax, and without the header the join would have to
  reach for `column1`.
- `WHERE true` sits before `ON CONFLICT`. On an `INSERT ... SELECT` the parser
  otherwise reads `ON` as the start of another join constraint.

The joins are inner, so a mistyped task or focus slug contributes no row and raises no
error. That is the one silent failure mode here, and it is why
`test/seed-content.test.js` counts the rows in each block against the rows that landed.

A **tag** is not a slug and is not resolved against anything: it is a value, and a
misspelled one is a real tag with one member. The tests catch the shape — lowercase
words joined by hyphens, a mode name from the seven — and the focus tab shows how many
prompts carry each tag, which is where a typo is visible.

## Changing a row that is already seeded

A press will not touch it — the inserts are `ON CONFLICT DO NOTHING`, and that is what
protects an edit you made in the app. Two ways round it, and both are browser-only:

- **The library editor** (slice 08), for one row. This is the right tool for a typo
  found in a month already running.
- **Erase everything, Apply pending, Run seed** on `/admin`, for a correction to the
  file itself. Every table drops and both files are re-read, so the edit lands as
  written. There is no data in this database worth protecting from that, which is why
  `001_schema.sql` and `002_seed.sql` are rewritten in place rather than appended to —
  and it is what let the tag tables replace the weights table at all.
