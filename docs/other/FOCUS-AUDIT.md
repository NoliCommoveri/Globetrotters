# Focus audit

Which focus each weeks 2–3 prompt actually serves, judged by reading the prompt rather
than by reading its tags. This is the reference the `focus_tags` weights are tuned
against, and the ground truth every draw simulation in `../design/LIBRARY_v3.md` §3 is
scored on.

---

## Why it exists

Grading a tag table by counting which prompts carry a tag the focus weights at 3 grades
the table against itself. Every prompt added since v2 that has not been hand-curated
scores as off-theme by construction, and a focus whose defining tags happen to sit in one
half of the library reads as healthy while producing weeks of work that ignore it.

So: 155 prompts read, each judged against all nine focuses on one question.

> **Would a learner who picked this focus recognise this task as an instance of what they
> picked?**

Zero to three focuses per prompt. 213 assignments. Five prompts serve no focus squarely
and that is not a defect — `wow-fact` is pinned for exactly that reason.

The territories held to:

| Focus | Territory |
|---|---|
| Ancient World | deep time, ruins, who ruled, old objects, founding legends, early church |
| Wild Places | wild animals and plants, extinction, protected land, environmental damage |
| People and Power | government, law, voting, public services, public money, advocacy, school as a system |
| Food and Craft | eat, cook, grow, farm, make, trade |
| Conflict and Change | wars, empires, borders, independence, forced movement |
| Land and Sky | landform, weather, water, altitude, sun |
| Who Lives Here | family, houses, routines, health, cities, ordinary days |
| Who Gets What | who has less, who owns it, who is paid, who took it |
| Stories and Spirits | legends, belief, names, music, language |

---

## What it found

| Focus | natural wk2 | natural wk3 | total |
|---|---|---|---|
| Ancient World | 11 | 1 | 12 |
| Wild Places | 14 | 3 | 17 |
| People and Power | 20 | 3 | 23 |
| Food and Craft | 9 | 19 | 28 |
| Conflict and Change | 9 | 1 | 10 |
| Land and Sky | 16 | 3 | 19 |
| Who Lives Here | 13 | 27 | 40 |
| Who Gets What | 25 | 3 | 28 |
| Stories and Spirits | 9 | 27 | 36 |

**The tagging is accurate.** Graded against this audit, `prompt_tags` × `focus_tags`
scores ~100% recall and 60–92% precision on each focus's top-N by weight. Three prompts
are on-theme by hand and carry nothing the focus weights — `made-because-they-needed-it`
and `where-you-buy-clothes` (Food and Craft), `when-it-reached-everybody` (Who Gets What).
No prompt weighted ×7 or above is off-theme for the focus weighting it. The self-onboarding
the tag system was built for does work.

**The weighting was too flat.** At `1 + Σw` a focus lifts on-theme content about 2× over
drawing with no focus at all, which lands as 1.5 of 10 tasks for a thin focus. Hence the
`2 ×` in `draw_weight` (`../design/LIBRARY_v3.md` §3).

**The content is week-lopsided, and that was the real defect.** Five focuses have three or
fewer on-theme prompts on one side of the old week-2/week-3 line; Ancient World and
Conflict and Change have one each. Nine topic tags with five or more members live entirely
in one week — `governance` 15/0, `empire-and-rule` 11/0, `wildlife` 8/0,
`damage-and-repair` 8/0, `deep-time` 5/0, `who-owns-it` 5/0, `water` 5/0,
`conflict-history` 4/0, `play-and-sport` 0/5. Under two separate per-week draws that put a
week with none of the chosen focus in it at 20–90% of months, per focus. The merged pool
is the answer to that; the twelve prompts still owed are the rest of it.

---

## Judgement calls worth revisiting

- `landmark-to-see` and `wow-fact` judged as serving no focus — both are deliberately
  generic. Reading `landmark-to-see` as Ancient World is defensible.
- Sport and outdoor play put under Who Lives Here rather than Wild Places, where
  `play-and-sport` is weighted 2 today. Flipping that takes Wild Places' natural-week-3
  count from 3 to 6.
- Schooling split by altitude: system-level questions (free? how many years? who
  finishes?) to People and Power and Who Gets What, a kid's own day to Who Lives Here.

---

## The table

**Wk** is the prompt's natural half in `../design/LIBRARY_v3.md` §2, not where it prints:
weeks 2 and 3 draw from one pool and the deal decides which week a prompt lands in. The two
pins are the exception — `wow-fact` always week 2, `cook-it` always week 3.

| Prompt | Wk | Judged on-theme for |
|---|---|---|
| `ancient-site` | 2 | Ancient World |
| `animal-in-trouble` | 2 | Wild Places |
| `before-history` | 2 | Ancient World |
| `bible-in-their-tongue` | 2 | Stories and Spirits |
| `bible-name-now-name` | 2 | Stories and Spirits, Ancient World |
| `border-that-moved` | 2 | Conflict and Change |
| `can-they-worship-freely` | 2 | People and Power, Who Gets What, Stories and Spirits |
| `climate-bands` | 2 | Land and Sky |
| `desert-shall-blossom` | 2 | Wild Places, Land and Sky |
| `dinosaur-that-lived-here` | 2 | Ancient World, Wild Places |
| `family-size` | 2 | Who Lives Here |
| `first-people` | 2 | Ancient World |
| `help-when-money-runs-out` | 2 | Who Gets What, People and Power |
| `highest-point` | 2 | Land and Sky |
| `how-a-law-is-made` | 2 | People and Power |
| `how-high-they-live` | 2 | Land and Sky |
| `how-long-they-live` | 2 | Who Lives Here, Who Gets What |
| `how-many-languages` | 2 | Stories and Spirits |
| `how-they-learn` | 2 | People and Power, Who Lives Here |
| `how-they-say-it-began` | 2 | Stories and Spirits, Ancient World |
| `how-you-get-a-house` | 2 | Who Lives Here, Who Gets What |
| `if-you-break-a-rule-there` | 2 | People and Power |
| `independence-day` | 2 | Conflict and Change |
| `is-the-law-kept` | 2 | Who Gets What, People and Power |
| `kingdom-over-this-place` | 2 | Who Gets What, Stories and Spirits |
| `landforms` | 2 | Land and Sky, Wild Places |
| `law-you-notice` | 2 | People and Power |
| `long-before-people` | 2 | Ancient World, Wild Places |
| `made-because-they-needed-it` | 2 | Food and Craft |
| `made-here` | 2 | Food and Craft |
| `made-there-first` | 2 | Food and Craft, Stories and Spirits |
| `most-common-names` | 2 | Stories and Spirits, Who Lives Here |
| `oldest-thing-here` | 2 | Ancient World |
| `plants-that-heal` | 2 | Wild Places |
| `rain-in-a-year` | 2 | Land and Sky |
| `rain-through-the-year` | 2 | Land and Sky, Food and Craft |
| `river-that-matters` | 2 | Land and Sky, Wild Places |
| `somebody-elses-museum` | 2 | Who Gets What, Conflict and Change, Ancient World |
| `the-company-that-got-caught` | 2 | Who Gets What, Wild Places |
| `the-first-church-there` | 2 | Ancient World, Stories and Spirits |
| `the-group-that-gets-less` | 2 | Who Gets What |
| `the-job-a-kid-does` | 2 | Who Gets What |
| `the-last-hundred-years` | 2 | Conflict and Change |
| `the-one-that-is-gone` | 2 | Wild Places |
| `the-work-nobody-wants` | 2 | Who Gets What |
| `their-working-day` | 2 | Who Lives Here, Who Gets What |
| `tree-that-grows` | 2 | Wild Places, Food and Craft |
| `under-the-ground` | 2 | Land and Sky |
| `war-that-changed` | 2 | Conflict and Change |
| `water-to-the-tap` | 2 | People and Power, Land and Sky |
| `weather-that-hits` | 2 | Land and Sky |
| `weather-there-now` | 2 | Land and Sky |
| `what-the-land-is-used-for` | 2 | Land and Sky, Wild Places, Food and Craft |
| `what-their-money-goes-to` | 2 | People and Power, Who Gets What |
| `what-they-are-working-on` | 2 | — none |
| `what-they-do-for-you` | 2 | People and Power, Who Gets What |
| `what-they-grow` | 2 | Food and Craft, Land and Sky |
| `what-they-plan-next` | 2 | People and Power |
| `what-work-pays` | 2 | Who Gets What |
| `what-work-they-do` | 2 | Who Lives Here, Who Gets What |
| `whats-in-the-news` | 2 | — none |
| `when-it-reached-everybody` | 2 | Who Gets What, People and Power |
| `when-you-are-old-enough` | 2 | People and Power, Who Lives Here |
| `where-the-food-grows` | 2 | Food and Craft, Land and Sky |
| `where-the-ground-shakes` | 2 | Land and Sky |
| `where-the-price-goes` | 2 | Who Gets What |
| `where-the-trash-goes` | 2 | People and Power, Wild Places |
| `where-they-go-when-they-go` | 2 | Who Lives Here |
| `who-came-and-who-left` | 2 | Conflict and Change, Who Lives Here |
| `who-can-read` | 2 | Who Gets What, People and Power |
| `who-can-vote` | 2 | People and Power |
| `who-comes-when-it-burns` | 2 | People and Power |
| `who-finishes-school` | 2 | People and Power, Who Gets What |
| `who-leads` | 2 | People and Power |
| `who-lives-there` | 2 | Who Lives Here, Who Gets What |
| `who-owns-the-roof` | 2 | Who Gets What, Who Lives Here |
| `who-ruled-before` | 2 | Ancient World, Conflict and Change |
| `who-speaks-up-there` | 2 | People and Power, Who Gets What |
| `who-they-took-in` | 2 | Conflict and Change, Who Gets What |
| `who-they-trade-with` | 2 | Food and Craft |
| `who-was-taken-from-here` | 2 | Who Gets What, Conflict and Change |
| `wild-animal` | 2 | Wild Places |
| `wild-place-protected` | 2 | Wild Places |
| `young-or-old` | 2 | Who Lives Here |
| `your-money-there` | 2 | — none |
| `a-whole-name` | 3 | Stories and Spirits, Who Lives Here |
| `animals-on-the-menu` | 3 | Food and Craft |
| `ask-for-the-bathroom` | 3 | Stories and Spirits |
| `before-you-visit` | 3 | Who Lives Here |
| `bible-happened-here` | 3 | Stories and Spirits, Ancient World |
| `breakfast-there` | 3 | Food and Craft |
| `city-and-country` | 3 | Who Lives Here |
| `city-then-and-now` | 3 | Conflict and Change, Who Lives Here |
| `cook-it` | 3 | Food and Craft |
| `craft-of-the-land` | 3 | Food and Craft |
| `creature-they-warn-about` | 3 | Stories and Spirits |
| `drink-with-dinner` | 3 | Food and Craft |
| `famous-dish` | 3 | Food and Craft |
| `feast-they-keep` | 3 | Stories and Spirits, Food and Craft |
| `find-them-near-us` | 3 | Who Lives Here |
| `first-money-they-earn` | 3 | Who Gets What, Who Lives Here |
| `from-school-to-work` | 3 | People and Power, Who Lives Here |
| `game-kids-play` | 3 | Who Lives Here |
| `getting-around` | 3 | Who Lives Here |
| `getting-around-if-you-cant-walk` | 3 | Who Gets What |
| `girls-and-women` | 3 | Who Gets What |
| `grows-better-there` | 3 | Food and Craft, Land and Sky |
| `have-they-been-away` | 3 | Who Lives Here |
| `hear-from-a-kid` | 3 | Who Lives Here |
| `holiday-dish` | 3 | Food and Craft, Stories and Spirits |
| `holiday-they-mark` | 3 | Stories and Spirits |
| `holidays-through-the-year` | 3 | Stories and Spirits |
| `house-they-live-in` | 3 | Who Lives Here |
| `how-they-make-it` | 3 | Food and Craft |
| `how-they-remember-the-dead` | 3 | Stories and Spirits, Who Lives Here |
| `if-you-get-sick` | 3 | Who Lives Here, People and Power |
| `kid-life` | 3 | Who Lives Here |
| `landmark-to-see` | 3 | — none |
| `life-outdoors` | 3 | Who Lives Here, Wild Places |
| `luck-there` | 3 | Stories and Spirits |
| `market-day` | 3 | Food and Craft |
| `market-days` | 3 | Food and Craft |
| `nations-before-the-throne` | 3 | Stories and Spirits |
| `place-of-worship` | 3 | Stories and Spirits |
| `sabbath-keepers-there` | 3 | Stories and Spirits |
| `same-day-different-name` | 3 | Stories and Spirits |
| `school-lunch` | 3 | Food and Craft, Who Lives Here |
| `something-sweet` | 3 | Food and Craft |
| `sound-of-the-country` | 3 | Stories and Spirits |
| `story-they-tell` | 3 | Stories and Spirits |
| `street-animals` | 3 | Wild Places, Who Lives Here |
| `street-food` | 3 | Food and Craft |
| `sun-up-sun-down` | 3 | Land and Sky |
| `the-sport-they-love` | 3 | Who Lives Here |
| `their-alphabet` | 3 | Stories and Spirits |
| `their-rest-day` | 3 | Who Lives Here, Stories and Spirits |
| `tonights-dinner` | 3 | Food and Craft |
| `what-a-kid-carries` | 3 | Who Lives Here |
| `what-every-kid-learns` | 3 | People and Power, Who Lives Here |
| `what-makes-them-laugh` | 3 | Stories and Spirits |
| `what-people-believe` | 3 | Stories and Spirits |
| `what-the-old-people-say` | 3 | Stories and Spirits |
| `what-they-can-plug-in` | 3 | Who Lives Here |
| `what-they-keep` | 3 | Wild Places, Who Lives Here |
| `what-they-name-babies-now` | 3 | Stories and Spirits, Who Lives Here |
| `what-they-plow-with` | 3 | Food and Craft |
| `what-they-say-about-us` | 3 | Who Lives Here |
| `what-they-wear` | 3 | Food and Craft |
| `what-year-is-it-there` | 3 | Stories and Spirits |
| `when-sabbath-starts` | 3 | Stories and Spirits, Land and Sky |
| `where-you-buy-clothes` | 3 | Food and Craft, Who Lives Here |
| `who-is-famous` | 3 | Stories and Spirits |
| `who-worships-what` | 3 | Stories and Spirits |
| `word-they-have` | 3 | Stories and Spirits |
| `wow-fact` | 3 | — none |
