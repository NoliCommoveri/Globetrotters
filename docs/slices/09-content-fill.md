# Slice 09 — Content fill

**Status:** not started
**Band:** L
**Implements:** §9, §13
**Depends on:** 04 (needs a working draw to tune against)

**Goal.** The thing that decides whether the app is good rather than merely
working.

This is append-only migration work and needs no application code, so it can run
alongside slices 07 and 08, and it can keep growing all year.

---

## Due-outs

None.

## Open questions

None.

## Build

### `002_seed.sql` grown to ~90 templates

| Week | Templates | Coverage |
|---|---|---|
| 1 | 10 | 4 `core` always drawn (flag, map, location/borders, language & writing system); the rest — basic stats, national symbols, currency, neighbors, time zones, size comparison — fill the 5th slot |
| 2 | 25 | history, government, law, land, climate, ecology, prehistory |
| 3 | 25 | people, religion, daily life for kids and women, food, art, music, sport, wow facts, landmarks |
| 4 | 30 | 5 per project type, across all six, as ordered sequences: choose the artifact, gather materials, build, build, rehearse & present |

Every `prompt` in second person to a 5th grader, one clear action, finishable in
ten minutes. "Find out which animal is on their money and draw it" — not
"Research national symbolism."

`task_focus_weights` rows only where a focus has an opinion: 3 for on-theme, 0
to exclude. Neutral tasks get no row.

Weeks 1–3 hold all research and aggregation. Week 4 is production only.

### `003_country_data.sql`

Separate from the core seed so it can be extended without touching it. All of
it generated once, at build time, into a migration: no runtime API, no service
dependency, works offline, hand-quality rather than algorithmic.

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
- **Coverage: 75–100 countries**, chosen for spread across continent, adventure
  level, and focus affinity. The rest stay selectable but unadorned.

### The boundary

Affinity never touches the draw. Tasks are country-agnostic; this data only
ranks and explains at pick time. If those two systems couple, you lose the
property that a kid can change countries any time.

## Exit criteria

- Deal me three never deals a blank, on ten consecutive shuffles
- Every focus has ≥15 templates at weight ≥1 across weeks 2 and 3
- Nine consecutive months drawn for one person show no week with a repeat
- All six project types are selectable with a full week-4 sequence
- Every prompt reads as one action a 5th grader can finish in ten minutes
- Every hook reads as a lead; spot-check twenty at random for assertions
- The seed still runs twice with no change on the second run

## Do not build

- A runtime country API or any service dependency. All of this is generated
  once into a migration file.
- Edits to `002_seed.sql`'s existing rows. Migration files are append-only, and
  the seed upserts on `slug` — new templates are new rows, and a correction to
  a shipped row is made in the library editor, not in SQL.
