# Slice 09 — Content fill

**Status:** built
**Band:** L
**Implements:** §9, §13, and §16's bindings
**Depends on:** 04 (needs a working draw to tune against); the worksheet
bindings additionally need 10

**Goal.** The thing that decides whether the app is good rather than merely
working.

Seed work and no application code, which is why it could run after 07 and 08 in
any order — and why it can keep growing all year without another slice.

Three features built inert in slice 04 came alive when `003_country_data.sql`
landed, with no client change: the hook line on a country card, the recommended
focuses with their reason lines, and **Deal me three**.

---

## Due-outs

None.

## Open questions

None. Q-11 — whether week 4's "present" task requires an audience — was answered
while this slice was built: it does not. All six sequences end "present it to
your family," whoever that turns out to be on the day.

## Build

### `002_seed.sql` grown to 90 templates

| Week | Templates | Coverage |
|---|---|---|
| 1 | 10 | 4 `core` always drawn (flag, map, location/borders, language & writing system); the rest — basic stats, national symbols, currency, neighbors, time zones, size comparison — fill the 5th slot |
| 2 | 25 | history, government, law, land, climate, ecology, prehistory |
| 3 | 25 | people, religion, daily life for kids and women, food, art, music, sport, wow facts, landmarks |
| 4 | 30 | 5 per project type, across all six, as ordered sequences: choose the artifact, gather materials, build, build, rehearse & present |

Every `prompt` in second person to a 5th grader, one clear action, finishable in
ten minutes. "Find out which animal is on their money and draw it" — not
"Research national symbolism."

Five of the ninety carry the family's Sabbath and Kingdom lens — two in week 2,
three in week 3 — and five is the deliberate size of it (`DESIGN.md` §13). They
obey every rule the other eighty-five do, country-agnostic included: every
country has a rest day, a harvest festival, and something that needs fixing.

`task_focus_weights` rows only where a focus has an opinion: 3 for on-theme, 0
to exclude. Neutral tasks get no row.

Weeks 1–3 hold all research and aggregation. Week 4 is production only.

### `003_country_data.sql`

**222 hooks and 200 affinities across 100 countries.** Separate from the core
seed so it can be extended without touching it. All of it written once, at build
time, into the file: no runtime API, no service dependency, works offline,
hand-quality rather than algorithmic.

- **Hooks — 2–3 per country.** The gravitational pull. Not facts, not
  statistics: one concrete image each. The salt flat satellites use to
  calibrate their cameras. A kid scrolling a continent should hit a sentence
  that makes them stop.
- **Every hook is phrased as a lead, not a fact.** "Find out what's carved into
  the desert at Nazca" — never "The Nazca lines are 2,000 years old and were
  made by…" Several hundred generated hooks will contain errors. A hook phrased
  as a lead turns an error into a dead-end search; a hook phrased as an
  assertion turns it into a false sentence in a workbook. It's also better
  pedagogy: the app points, the kid finds.
- **Focus affinity — 2–3 per country, with a reason.**
  `Egypt + ancient-world: you'll have more to draw than fits on the page.`
  `Iceland + land-and-sky: the ground is still being built.` Only
  recommendations are stored (score 2 or 3); absence means neutral.
- **Research depth — 1 to 3.** Framed as adventure level, not difficulty:
  "lots to find" / "some digging" / "you'll have to hunt." Some countries have
  thin kid-accessible material, and twenty tasks on a country with almost
  nothing findable is a month of dead ends and a demoralized 11-year-old.
- **Coverage: 100 countries**, chosen for spread and asserted on it — every
  continent carries at least five, all three adventure levels are represented,
  and every focus is recommended for at least fifteen countries. The other 95
  stay selectable but unadorned.
- **A hook is re-seeded per country, not per hook.** `country_hooks` has no
  natural key, so the insert skips any country that already holds a hook. That
  is what makes the editor's one delete (Q-14) survive the next press of Run
  seed, and it means a hook added to the file for an already-seeded country will
  not land — that edit belongs in the editor.

### Worksheet bindings — the one part not built

Every template written or revised here also gets its `worksheet_layout_id` —
which of slice 10's twelve printed forms its segment uses — and a
`worksheet_spec` where the layout needs one (a caption, column headers, a line
count). It is one column on a row this slice is already writing, so it happens
here rather than in a pass of its own.

Two rules:

- **Weeks 1–3 only.** Week 4 is production and prints as a single sheet with no
  per-task segments (§16). Its templates leave the column null.
- **Null is a working answer.** An unbound template prints its prompt over eight
  ruled lines. Bind the ones where a real form helps — a box for anything drawn,
  two columns for anything compared, a table for anything with three facts a row
  — and leave the rest. A wrong form is worse than ruled lines.

**Slice 10 has not landed, so `worksheet_layout_id` and `worksheet_spec` do not
exist as columns and no binding could be written.** Every template written here
leaves them for slice 10, which adds the column and the bindings together; until
then a drawn task prints its prompt over eight ruled lines, which is a usable
page. Nothing else in this slice waited on it.

### The boundary

Affinity never touches the draw. Tasks are country-agnostic; this data only
ranks and explains at pick time. If those two systems couple, you lose the
property that a kid can change countries any time.

## Exit criteria

All met but the last, which cannot be met until slice 10 exists. Each is an
assertion rather than a claim — the test that holds it is named.

- ✅ Deal me three never deals a blank, on ten consecutive shuffles —
  `test/deal.test.js`, run as written against the real seed
- ✅ Every focus has ≥15 templates at weight ≥1 across weeks 2 and 3. Trivially
  true at 25 a week with at most one exclusion, so the assertion that earns its
  place is the stronger one: six weight-3 tasks per focus per week —
  `test/seed-content.test.js`
- ✅ Nine consecutive months drawn for one person show no week with a repeat —
  `test/draw.test.js`, nine months against the real library for each of the six
  focuses, which is the worst case a kid who knows what they like produces
- ✅ All six project types are selectable with a full week-4 sequence —
  `test/seed-content.test.js`
- ✅ Every prompt reads as one action a 5th grader can finish in ten minutes
- ✅ Every hook reads as a lead — every one of the 222 opens `Find out`, `Look
  up` or `Find` and none ends in a full stop, `test/deal.test.js`
- ✅ The seed still runs twice with no change on the second run, and a hook
  deleted in the editor stays deleted through the second press —
  `test/country-data.test.js`
- ⬜ A drawn month prints with a bespoke form on every drawn task in weeks 1–3
  that has one. **Slice 10.** The column does not exist yet, so no binding could
  be written; every task prints its prompt over ruled lines until it does.

## Do not build

- A runtime country API or any service dependency. All of this is generated
  once into a migration file.
- Edits to `002_seed.sql`'s existing rows. The seed upserts on `slug`, so new
  templates are new rows appended inside the block markers, and a correction to
  a shipped row is made in the library editor, not in SQL.
