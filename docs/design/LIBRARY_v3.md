# The library

Every printed form, every prompt, and which form each prompt lands on. This is the whole
library as it should stand: **28 forms on 18 renderers, 197 prompts across four weeks,
nine focuses.**

Everything in the four superseded drafts is either carried here, rewritten here, or
deliberately dropped — §5 lists what was dropped and why.

Each entry is marked **NEW**, **UPDATE**, **KEEP** or **DROP** against what is in the
database today.

**Status: spec, not built.** `DESIGN.md` §16 governs how a worksheet prints — thirds,
packing, the route, specs-as-data, the library editor's reach — and none of that changes
here. This governs only which forms exist, what each one holds, and which prompt lands on
which.

**What this library is for.** A learner gets five or six tasks a week and about nine
sheets of paper a month. The prompt says what to find out. The form under it says what
shape the answer has — and a form that doesn't match its prompt costs twice: the kid
writes prose where a drawing belonged, and the sheet looks like the last one.

**Who it is written for.** Three learners, home educated, working the same country in the
same month. No prompt assumes a school building, a school bus, a school cafeteria or a
classroom of thirty. Where a prompt asks a kid to compare their own life, the comparison
is to their house, their week and their own day — because that is what they actually have
to compare with.

**On the hard subjects.** The wording is pitched at a ten-minute instruction a
twelve-year-old can act on without help. The *subject matter* is not pitched down. Twelve
prompts in this library ask about slavery, forced labor, child labor, occupation, looted
objects, religious persecution, disability, who gets less and who gets paid. They are
written so a country can give a bad answer, and none of them is written so that finding
one is the point. A prompt that only works if the answer is ugly is propaganda; a prompt
that cannot survive an ugly answer is a lie. Every one of the twelve has a fallback
clause, and in most cases the fallback is the more interesting half.

**The rule the rest of it follows.** Ruled lines are what a prompt gets when its answer
genuinely has no shape. Twelve prompts print on them out of 167: four because a scripture
passage or a paragraph in the kid's own voice wants room and nothing else, and the rest
because the writing *is* the finding.

---

## 1. The forms

Twenty-eight forms, built on eighteen renderers. A form is a row in `worksheet_layouts`;
a renderer is a `kind` in `worksheet.js`. Several forms share one renderer and differ only
in their spec, which is why the list is long and the code is not.

**No form, renderer or knob is new in v3.** Every one of the 83 prompts added since v2
lands on a form that v2 already declares. The build sequence in §6 is unchanged.

**Heights are the load-bearing number.** A sheet holds three thirds and a form never
splits across a page break, so a form that overflows its declared height pushes the next
one off the paper. Change a height before you change anything else about a form.

**A spec is data, never markup.** The renderer reads the keys it knows for that kind,
escapes every string, and drops the rest.

**A form carries a slot for every thing its prompt asks for, and asks for every slot it
carries.** This cuts both ways. A prompt that ends in *and write one sentence* over a form
with `lines: 0` sends the sentence to the margin. A form with four ruled lines under a
prompt that asks for one word prints three empty lines every month and teaches the kid
that most of the paper is decoration. Every binding in §2 declares a spec that matches its
prompt count for count. Three v2 bindings failed this on the `shared` row and are fixed
here.

---

### Ruled lines — kind `lines`

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `lines-4` | **KEEP** | 1 | `{"lines":4}` | LINES |
| `lines-8` | **KEEP** | 2 | `{"lines":8}` | LINES |

`lines-8` is the scripture form: four prompts read a passage and write what it means for
the country in front of them. **Its two v2 bindings asked for one or two lines against
eight ruled ones and are rewritten here to ask for five or six**, which is what the form
was always sized for.

`lines-4` carries the prompts whose answer is prose on purpose — the wow fact, the drink,
a headline retold, a joke that had to be explained, a founding legend, one person from the
country speaking for themselves. These are the only prompts where the writing *is* the
finding, and a caption over them would decide the answer before the kid got there.

`lines-4` is also the fallback for any prompt with no binding, so it can never be retired.

---

### Labelled short answers — kind `fields` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `fields` | **NEW** | 1 | `{"captions":["","",""],"lines_each":1}` | CAPTIONS, LINES_EACH |

Two to four stacked slots, each a small caption in the margin above one or two ruled
lines. Renders whatever length CAPTIONS is.

**This form only works if every binding sets CAPTIONS.** Shipped with empty defaults it
becomes the new ruled lines inside a month.

**Twelve is the cap, and it has held across 83 new prompts.** `fields` is the most
reachable shape in the set and the easiest to write a prompt for, which is exactly why it
runs away with a week. New prompts go on a form that makes the answer visible — a drawing,
a bar, a bullet, a map — or they go on ruled lines. They do not go here. At 167 bindings
`fields` is 7.2% of the library, down from 14.3%.

---

### One box — kind `box`

`lines` puts writing room beside the box, or under it when BELOW is set; `callouts` puts
numbered leader lines down its side. A form uses one or the other or neither.

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `box-beside` | **KEEP** | 1 | `{"caption":"Sketch it","lines":4,"callouts":0}` | CAPTION, LINES, CALLOUTS |
| `box-note` | **NEW** | 2 | `{"caption":"Draw it here","lines":2,"below":true,"callouts":0}` | ” |
| `box-caption` | **DROP** | — | — | — |
| `label-small` | **NEW** | 2 | `{"caption":"Draw it, then label the parts","lines":0,"callouts":3}` | ” |
| `label-it` | **KEEP** | 3 | `{"caption":"Draw it big, then label the parts","lines":0,"callouts":6}` | ” |

`box-caption` is retired and `box-note` takes its prompts.

`label-small` fills the gap between a drawing box with nowhere to write labels and a
full-sheet sketch with six of them. It also takes the one prompt in the library that
labels something written rather than drawn: a full name, taken apart.

**`label-it` has exactly one prompt and that is the rule, not the current state.** It
takes a whole sheet. The land is the one subject in a month worth a full page. A second
`label-it` binding doubles the odds of a full-page draw and, in practice, prints the same
physical act twice — *draw the country big enough to fill the page, then label six things
on it.* `climate-bands` was written against this form and is rebound to `map-marks` here.

---

### Several boxes, each labelled — kind `boxes` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `specimen-boxes` | **NEW** | 2 | `{"boxes":4,"caption":"","label_lines":1,"circle_one":false}` | BOXES (2–6), CAPTION, LABEL_LINES, CIRCLE_ONE |

A row or a 2×2 block of small drawing boxes, one ruled label line under each. When
CIRCLE_ONE is true, an instruction line at the foot: *circle the one that…*

*Find several things and draw each one* is a whole class of prompt: four things in a
market, four minerals, four medicine plants, four animals that live with people, four
characters of their alphabet, a repeating pattern.

---

### Two columns — kinds `split` and `table`

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `split-two` | **KEEP** | 1 | `{"columns":["Their word","How it sounds"],"rows":4}` | COLUMNS, ROWS |
| `differences` | **NEW** | 1 | `{"columns":["There","Here"],"rows":3,"shared":1}` | COLUMNS, ROWS, SHARED |
| `table-3` | **KEEP** | 2 | `{"columns":["What","Where","Why it matters"],"rows":4}` | COLUMNS, ROWS |
| `compare` | **DROP** | — | — | — |

**Two rules on `differences`, both new in v3 and both learned the hard way.**

*Every binding that sets `shared: 1` must ask for the shared row in its wording.* Three v2
and v3 bindings printed a *But the same:* rule under a prompt that never asked for it —
`family-size`, `school-lunch`, `when-they-were-protected`. All three are fixed below.

*No two bindings use the same closing sentence.* At nine bindings, `differences` is the
second-largest form in the library, and the felt repetition is not the form — it is that
seven of them ended in the identical fourteen words. The nine closers here are all
different and all ask for the same thing.

`table-3` is now the workhorse for three-part answers that repeat down rows, and it is
where several prompts landed that would otherwise have gone to `fields`: the law and what
actually happens, the job and who does it, the name and where it came from.

---

### The overlap — kind `venn` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `venn` | **NEW** | 2 | `{"labels":["There","Here"],"shared":"Both","lines_each":3}` | LABELS, SHARED, LINES_EACH |

Two overlapping circles, printed labels on each lobe and on the overlap, three faint ruled
guides in each of the three zones. The Venn is for a prompt whose answer *is* the overlap.
`differences` holds the same data in a third of the space.

Held to three bindings. A fourth was cut: week 3 was carrying four Venns and three of them
food.

---

### Sequence and change

| Form | | Thirds | Kind | Spec | Knobs |
|---|---|---|---|---|---|
| `timeline` | **KEEP** | 1 | `timeline` | `{"ticks":5,"unit":"years","ends":["",""]}` | TICKS, UNIT, ENDS |
| `flow-steps` | **NEW** | 1 | `flow` | `{"steps":4,"orient":"across","caption":""}` | STEPS, ORIENT, CAPTION |
| `then-now` | **NEW** | 2 | `pair` | `{"captions":["Before","After"],"lines_each":2,"middle":""}` | CAPTIONS, LINES_EACH, MIDDLE |
| `storyboard` | **KEEP** | 2 | `storyboard` | `{"panels":6,"caption":""}` | PANELS, CAPTION |

**`timeline`** — ENDS labels the two endpoints, and the labels are what stop two timelines
in one workbook from reading as the same page. **No ENDS value hard-codes a year that will
go stale**: *A hundred years ago* and *Today*, not *1925*.

**`flow-steps`** is boxes joined by arrows: *this causes the next thing*. Seven bindings,
and **no two share an opening sentence** — the v3 batches wrote five of them as "Draw the
four steps in order, from X to Y," which is the same monotony problem `differences` had.

**`then-now`** is two panels with an arrow between them. MIDDLE is a captioned write-in
line on the arrow itself — a date, a number, a name. Four of seven bindings use it, and
they are the four where the hinge is the finding: the year the last one was seen, the date
they stopped belonging to somebody else, how many were taken and for how long, who carried
it off and when.

**`storyboard`** — CAPTION prints above the six panels, naming what they are of: a legend,
a Bible account, a process. Skipped when the string is empty, the same rule MIDDLE follows
on `then-now`.

---

### Numbers

| Form | | Thirds | Kind | Spec | Knobs |
|---|---|---|---|---|---|
| `figure-anchor` | **NEW** | 1 | `figures` | `{"caption":"","unit":"","anchor_prompt":"About the same as…"}` | CAPTION, UNIT, ANCHOR_PROMPT |
| `scale-strip` | **NEW** | 1 | `chart` | `{"mode":"scale","orient":"vertical","marks":2,"unit":"","captions":["",""]}` | MODE, ORIENT, MARKS, UNIT, CAPTIONS |
| `bar-graph` | **NEW** | 2 | `chart` | `{"mode":"bars","bars":5,"orient":"vertical","scale_marks":5,"axis_label":"","caption":""}` | MODE, BARS, ORIENT, SCALE_MARKS, AXIS_LABEL, CAPTION |
| `figures` | **DROP** | — | — | — | — |

**`figure-anchor`** is one large boxed number with its unit and a ruled line beneath.
**The anchor line is for something the kid already knows that is about the same size** —
that is the whole teaching. It is not a slot for a second unrelated fact. `how-far-away-is-it`
was written with a flight time in the anchor and is corrected here.

**The number in the box is always something the kid found, never something they
estimated.**

**`scale-strip`** is a ruled scale with write-in markers. MARKS is per binding: two for a
comparison, three where the range itself is the point.

**`bar-graph`** is the only thing in the library that makes relative size visible.
`orient: "horizontal"` gives the ranked version.

---

### Icon arrays — kind `grid` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `hundred-people` | **NEW** | 2 | `{"rows":10,"per_row":10,"key_rows":4,"caption":"If this country were 100 people"}` | ROWS, PER_ROW, KEY_ROWS, KEY, CAPTION, LABEL_LINES |
| `pictograph` | **NEW** | 1 | `{"rows":2,"per_row":10,"key":"Each figure =","label_lines":true}` | ” |

**The key and the row length have to multiply to the whole.** All six `pictograph`
bindings set the key to ten per figure.

**A `pictograph` prompt asks for exactly two numbers and no more.** Two rows hold two
quantities. `who-owns-the-roof` asked for a third and had nowhere to put it; its rows are
reassigned here to *own it there* and *own it here*.

---

### Lists — kind `checklist`

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `list-n` | **NEW** | 1 | `{"items":5,"marker":"number","circle_one":false}` | ITEMS, LABELS, MARKER, CIRCLE_ONE, ORIENT, CAPTION |
| `checklist` | **KEEP** | 1 | `{"items":8,"labels":[],"marker":"box"}` | ” |
| `week-strip` | **NEW** | 1 | `{"labels":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"marker":"box","orient":"across","caption":""}` | ” |
| `bullets` | **NEW** | 1 | `{"items":5,"marker":"bullet","circle_one":false}` | ” |

**`bullets` is n blank bullet points and nothing else.** It is the only form that asks a
kid to decide what counts as a finding: a ruled line invites a paragraph, a `fields`
caption has already decided what the three findings are. A bullet says *one thing here,
then stop and go find another*.

**A `bullets` prompt names the count and what a bullet is of.** ITEMS and the number the
prompt says must agree.

`list-n` and `bullets` differ by whether order is part of the answer. Countries around a
border going clockwise, the rules of a game, the year's holidays in the order they come,
and the five most popular baby names most-popular-first are ordered. Five things in a bag
and four points of manners are not.

**`week-strip` is held to two bindings.** Three shade-the-week prompts landed in one week-3
pool and two of them answered the same question; the interesting half of the third is
folded into `their-rest-day`.

`checklist` carries no prompt binding — week 4 composes it directly for the project's
materials and steps, and it must not be renamed or repurposed for that reason.

---

### The country itself — kind `map` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `map-marks` | **NEW** | 2 | `{"caption":"","pins":5}` | CAPTION, PINS (2–6) |

A large empty box framed as the country, with numbered pin circles printed down the side,
one ruled line each.

**PINS is never 1.** A numbered key with one entry is a caption wearing a costume.

**Every pin is a place inside the country, or on its edge.** `where-they-go-when-they-go`
pinned a foreign country on a map of this one and is rebound to `table-3`.

Available at three thirds if a country ever needs the room.

---

### Clocks — kind `clocks` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `clock-pair` | **NEW** | 1 | `{"faces":2,"captions":["Their clock","Our clock"],"digital_line":true,"lines":2}` | FACES, CAPTIONS, DIGITAL_LINE, LINES |

Two empty clock faces with twelve ticks each, a caption under each, a short ruled line for
writing the time in digits, and LINES ruled lines across the foot.

Four bindings, split two and two across weeks 2 and 3, so no month can draw three of them.
Asking a child to write a time in a table cell and asking them to draw the hands are not
the same task.

---

### The recipe page — kind `recipe` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `recipe-card` | **NEW** | 3 | `{"ingredients":10,"steps":6,"sketch":true}` | INGREDIENTS, STEPS, SKETCH |

Dish name and a *Serves* line at the head. A narrow amount column beside ten ingredient
lines. Six numbered step lines. A box at the foot captioned *How it actually turned out.*

Three thirds is deliberate: it cannot pack with anything else, so the recipe always lands
on a clean sheet that can come out of the binder and go on the counter.

---

## 2. The prompts

197 prompts. Week 1 is four fixed core tasks and one drawn from eight candidates. **Weeks
2 and 3 are one pool.** Ten tasks come out of it: eight drawn from the merged pool of 153,
plus the two pinned prompts — `wow-fact` in week 2 and `cook-it` in week 3 — and the ten
are then dealt four and four into the two weeks (§3, *The draw*). Week 4 is the project
sequence, five steps in order, one of six project types.

Wording is the ten-minute instruction in a kid's voice, and it names the things the form
has slots for.

Every week 1–3 entry carries `tags` (topic) and `mode` (how the answer is produced). §3
explains why those are two namespaces and not one. The legacy `page` value is kept so the
rows can be seeded before `prompt_tags` exists and backfilled after.

---

### Week 1 — the fixed opening

Four core tasks every month, plus one drawn from eight wild candidates. Eight candidates
against nine months means a learner sees very nearly all of them in a year, which is the
right number — six was too few and ten would leave a third of them unseen.

**`flag-draw`** · **KEEP** · form `box-beside` · page `flag` · tier `core`
`tags: emblems, crafts`

> **Draw and color the flag**
> Find your country's flag and copy it into your workbook. Get the colors right, then write one line about what you think the colors are for.

Spec: `{"caption":"Their flag, in their colors","lines":2}`

**`map-outline`** · **UPDATE** · form `map-marks` · page `map` · tier `core`
`tags: landform, city-life` · `mode: map-work`

> **Trace the map and capital**
> Find a map of your country and trace its outline big enough to fill the box. Then mark three places on it and number them: the capital, the biggest city that isn't the capital, and one edge — a coast, a mountain range, a border you'd notice.

Spec: `{"caption":"Your country","pins":3}`

**`neighbors-list`** · **UPDATE** · form `list-n` · page `map` · tier `core`
`tags: landform, conflict-history` · `mode: map-work`

> **Find who your country borders**
> Look at the map and list every country that shares a border with yours, going clockwise from the top. If there are more than eight, list the eight with the longest borders. If it's an island with no land borders, write down the nearest country across the water instead.

Spec: `{"items":8,"marker":"number"}`

**`language-hello`** · **UPDATE** · form `split-two` · page `language` · tier `core`
`tags: language` · `mode: hands-on`

> **Say hello and thank you**
> Find out what language people speak there and how to say "hello" and "thank you." Write each one twice: once copied the way they spell it, and once the way it sounds out loud.

Spec: `{"columns":["The way they spell it","The way it sounds"],"rows":2}`

**`currency-animal`** · **KEEP** · form `box-beside` · page `money` · tier `wild`
`tags: emblems, public-money`

> **What is on their money?**
> Find a picture of their money. Which animal, plant or person is on it? Draw it, then write who or what it is and why a country would choose to put that on its money.

Spec: `{"caption":"Sketch it","lines":3}`

**`national-symbol`** · **UPDATE** · form `box-note` · page `symbols` · tier `wild`
`tags: emblems, wildlife`

> **Draw the national symbol**
> Find the country's coat of arms, national animal, or national flower. Draw it and write one sentence about why you think it was chosen.

Spec: `{"caption":"Their symbol","lines":2}`

**`how-many-people`** · **UPDATE** · form `figure-anchor` · page `people` · tier `wild`
`tags: city-life` · `mode: demographics-stat, us-contrast`

> **How many people live there?**
> Find out how many people live in your country. Write the number in the box, then find a US state — or a whole country you already know — with about the same number, so the number means something.

Spec: `{"caption":"People who live there","unit":"people","anchor_prompt":"About the same as…"}`

**`time-there-now`** · **UPDATE** · form `clock-pair` · page `map` · tier `wild`
`tags: sun-and-seasons, daily-life` · `mode: measurement, us-contrast`

> **Find out what time it is there**
> Work out what time it is in their capital right now. Draw the hands on both clocks and write both times in digits underneath, then write one sentence about what people there are probably doing.

Spec: `{"faces":2,"captions":["Their clock","Our clock"],"digital_line":true,"lines":2}`

**`size-next-to-yours`** · **UPDATE** · form `figure-anchor` · page `map` · tier `wild`
`tags: landform` · `mode: measurement, us-contrast`

> **How big is it really?**
> Find out how much land the country covers. Write it in the box, then find a state or a country you already know that is about the same size.

Spec: `{"caption":"How much land","unit":"square miles","anchor_prompt":"About the same size as…"}`

**`anthem-listen`** · **UPDATE** · form `lines-4` · page `symbols` · tier `wild`
`tags: emblems, music-and-art` · `mode: hands-on`

> **Listen to their anthem**
> Find their national anthem and listen to the first thirty seconds. Write one word for how it sounds, and one line about what it says the country is, or hopes it will be.

Spec: `{"lines":4}`

**`how-far-away-is-it`** · **NEW** · form `figure-anchor` · page `map` · tier `wild`
`tags: travel` · `mode: measurement, us-contrast`

> **How far away is it?**
> Find out how many miles it is from our house to their capital city. Write the number in the box, then work out how many times that is the longest drive our family has ever actually made.

Spec: `{"caption":"Miles from our house to their capital","unit":"miles","anchor_prompt":"That is about … times our longest drive, which was to…"}`

*Stretch: find how many hours a plane takes to fly it, and what that works out to in miles an hour.*

**`in-their-numbers`** · **NEW** · form `split-two` · page `map` · tier `wild`
`tags: trade, crafts, daily-life` · `mode: measurement`

> **Find the measurements only they use**
> Nearly every country measures in meters and kilograms — but most also kept older units of their own for land, rice, cloth, or distance walked. Find four things people there still measure their own way. Write each unit the way they say it, and next to it what it measures and roughly how big it is. If they truly use nothing but metric, find the four units they gave up and when they gave them up.

Spec: `{"columns":["Their unit","What it measures, and how big"],"rows":4}`

---

### Week 2 — Deep Dive

Eighty-six prompts, one of them the pinned `wow-fact`. **The week-2 heading is the
prompt's natural half, not a draw pool** —
weeks 2 and 3 draw from one merged pool of 153 (§3). It is read only by the deal's arc
preference, which leans these prompts toward the earlier week when nothing more important
is at stake. `wow-fact` is pinned here and never drawn. Ordered by subject so the coverage
is visible; nothing in the draw sees these headings.

#### Before there was anybody

**`long-before-people`** · **NEW** · form `timeline` · page `prehistory`
`tags: deep-time, extinction, wildlife`

> **What was walking here before anyone was**
> Find four creatures that lived on this land long before people did — dinosaurs, giant birds, mammoths, sea reptiles, cats with the wrong teeth. Mark roughly when each one lived and write its name at the mark. Notice how far along the line you get before the first one shows up. If nothing has been dug up in this country, use the nearest country that has and write which one.

Spec: `{"ticks":4,"unit":"years","ends":["200 million years ago","Today"]}`

**`dinosaur-that-lived-here`** · **NEW** · form `label-small` · page `prehistory`
`tags: deep-time, extinction`

> **Draw the one that lived here first**
> Find a dinosaur or other giant animal that lived where this country is now. Draw it alive, standing in the land the way it was then, and label three parts of it that tell you what it ate or how it moved. If nothing has been found there, draw the closest one that has been, and label where it was dug up.

Spec: `{"caption":"Draw it alive, then label three parts","callouts":3}`

**`before-history`** · **UPDATE** · form `box-beside` · page `prehistory`
`tags: deep-time, folklore-belief, crafts`

> **Find something from before writing**
> Find one fossil, cave painting or prehistoric find from this country that is still in the place it was found. Draw it, then write how long ago it got there and how anyone knows that.

Spec: `{"caption":"Still where it was found","lines":3}`

**`oldest-thing-here`** · **KEEP** · form `fields` · page `prehistory`
`tags: deep-time, crafts`

> **Find the oldest thing they keep**
> Find the oldest object kept in one of this country's museums. Find out how old it is and where it was dug up.

Spec: `{"captions":["What it is","How old it is","Where it was dug up"],"lines_each":1}`

#### The first people, and what is still standing

**`first-people`** · **KEEP** · form `fields` · page `history`
`tags: deep-time, empire-and-rule`

> **Find the first known people**
> Find out who the earliest known people living in this land were and roughly when they were here. Find one thing they left behind that people can still see or dig up.

Spec: `{"captions":["Who they were","About when they were here","One thing they left behind"],"lines_each":1}`

**`ancient-site`** · **KEEP** · form `box-note` · page `history`
`tags: crafts, empire-and-rule`

> **Find an ancient site**
> Find one ancient building, ruin, or site in this country that is hundreds or thousands of years old. Draw it, then write how old it is and how people know that.

Spec: `{"caption":"What is still standing","lines":2}`

#### History, empire, and what was carried off

**`who-ruled-before`** · **KEEP** · form `timeline` · page `history`
`tags: empire-and-rule, governance`

> **Find out who ruled before**
> Start in 1500 and work forward to now. Mark up to five times this land changed hands — a king, an empire, a set of villages that ran themselves, a country that took over. Write who was in charge at each mark.

Spec: `{"ticks":5,"unit":"years","ends":["1500","Today"]}`

**`the-last-hundred-years`** · **NEW** · form `timeline` · page `history`
`tags: milestone, conflict-history, empire-and-rule`

> **The last hundred years, in five marks**
> Find the five things that happened in this country in the last hundred years that people *there* would say changed it most — not the five a book here would pick. Mark each one and write what happened in a few words.

Spec: `{"ticks":5,"unit":"years","ends":["A hundred years ago","Today"]}`

**`war-that-changed`** · **KEEP** · form `timeline` · page `history`
`tags: conflict-history, empire-and-rule`

> **Find a fight that changed things**
> Find one war or uprising that changed this country. Mark three moments on the line — when it started, the moment it turned, and when it ended — and write what happened at each one.

Spec: `{"ticks":3,"unit":"years","ends":["It started","It ended"]}`

**`border-that-moved`** · **KEEP** · form `then-now` · page `history`
`tags: conflict-history, empire-and-rule, landform` · `mode: map-work`

> **Find a border that moved**
> Find out how this country's borders have changed in the last two hundred years. Draw the shape it was then and the shape it is now, and write what changed between them — including its name, if that changed too.

Spec: `{"captions":["Two hundred years ago","Today"],"lines_each":2}`

**`independence-day`** · **KEEP** · form `then-now` · page `history`
`tags: empire-and-rule, milestone, holiday-calendar`

> **Find the day they became a country**
> Find out when this country started ruling itself and who it belonged to before that. Write the date on the arrow, then show who was in charge before and what people do on that day now.

Spec: `{"captions":["Who they belonged to","What they do now"],"lines_each":2,"middle":"The date"}`

**`who-was-taken-from-here`** · **NEW** · form `then-now` · page `history`
`tags: forced-movement, empire-and-rule, conflict-history`

> **Find out whether people were taken from here — or brought here**
> Find out whether people from this country were ever taken away to work for someone else — sold, shipped, marched, or born into it — or whether people were brought *here* that way. Draw where they were taken from and to, and write on the arrow how many, and for how long. If neither happened here, find who does the worst-paid work here now and where they come from, and draw that instead.

Spec: `{"captions":["Where they were taken from","Where they were taken to"],"lines_each":2,"middle":"Roughly how many, for how long"}`

**`somebody-elses-museum`** · **NEW** · form `then-now` · page `history`
`tags: empire-and-rule, who-owns-it, crafts`

> **Find something of theirs in somebody else's museum**
> Find one thing made in this country that is now kept in a museum in another country. Draw the place it was made and the room it sits in now, and write on the arrow who took it and what year. Underneath, write whether anybody has asked for it back and what happened. If nothing of theirs ever left, find something in *their* museums that came from somewhere else, and do it that way round.

Spec: `{"captions":["Where it was made","Where it sits now"],"lines_each":2,"middle":"Who took it, and when"}`

**`when-it-reached-everybody`** · **NEW** · form `table-3` · page `history`
`tags: milestone, infrastructure, public-services` · `mode: us-contrast`

> **When ordinary people got it**
> Pick four of these and find the year each one reached ordinary families there, then the year it reached ordinary families here: electric light at home, running water in the house, school required for every child, women voting, a telephone in most homes.

Spec: `{"columns":["The change","The year there","The year here"],"rows":4}`

**`made-there-first`** · **KEEP** · form `box-note` · page `history`
`tags: science-research, crafts, music-and-art`

> **Find something the world got from them**
> Find one thing invented, written, painted, built or composed in this country that people outside it still use or still know. Draw it — or draw its cover — then write who made it and how it got out into the world.

Spec: `{"caption":"Made there first","lines":2}`

**`how-they-say-it-began`** · **NEW** · form `lines-4` · page `history`
`tags: folklore-belief, story-telling, empire-and-rule`

> **Find the story they tell about where they came from**
> Every country has a story about how it began, and it is usually not the one in the history book — a brother and a wolf, a bird that dropped a stone, an ancestor who walked out of the sea. Find this country's and write it in your own words, then write one line about what a history book says happened instead.

Spec: `{"lines":4}`

#### The Book and this land

**`bible-name-now-name`** · **NEW** · form `split-two` · page `history`
`tags: christian-history, empire-and-rule, language` · `mode: scripture-read`

> **Find this place in the Bible**
> Find out whether this land, a place in it, or a people from it is named anywhere in Scripture — Tarshish, Cush, Sheba, Macedonia, Media, the isles of the sea. Write three names the way the Bible writes them, and next to each the name the place goes by now. If nothing here is named, do it for the nearest land that is.

Spec: `{"columns":["The name in Scripture","What it is called now"],"rows":3}`

**`bible-in-their-tongue`** · **NEW** · form `timeline` · page `history`
`tags: christian-history, language, milestone`

> **When they first read it for themselves**
> Find out when the good news first reached this land, when the Bible was first printed in the language most people there speak, and one date since. Mark all three and write what happened at each mark. If it has never been printed in their language, mark the two you have and write that on the third.

Spec: `{"ticks":3,"unit":"years","ends":["First arrived","Today"]}`

**`the-first-church-there`** · **NEW** · form `box-note` · page `history`
`tags: christian-history, religion, crafts`

> **Draw the oldest one still standing**
> Find the oldest church or Christian meeting place still standing in this country. Draw it, then write when it was built and who built it. If there is none, draw the oldest place of worship there is and write when Christians first came — or that they have not.

Spec: `{"caption":"The oldest one still standing","lines":2}`

**`can-they-worship-freely`** · **NEW** · form `lines-8` · page `government`
`tags: religion, governance, advocacy, who-gets-less` · `mode: scripture-read`

> **Find out what it costs to believe there**
> Find out whether people in this country are free to worship, to meet, to own a Bible, to change what they believe. Read Matthew 5:10-12 and Hebrews 13:3. Then write five or six lines: what a believer there risks, what they do anyway, and what you would find hardest about it. If everybody there is free to believe what they like, write about who was not, the last time somebody wasn't.

Spec: `{"lines":8}`

**`kingdom-over-this-place`** · **UPDATE** · form `lines-8` · page `government`
`tags: religion, governance, who-gets-less` · `mode: scripture-read`

> **What the Kingdom fixes here**
> Find one thing this country is struggling with right now: war, hunger, drought, a ruler nobody chose. Read Micah 4:1-4. Then write five or six lines: what the struggle actually looks like for a family living in it, which verse speaks to it most directly, and what will be different in this place when the Kingdom comes.

Spec: `{"lines":8}`

#### Government, law, and the people asking for something

**`who-leads`** · **KEEP** · form `flow-steps` · page `government`
`tags: governance, civic-process`

> **Find out who leads the country**
> Find out what this country's leader is called and how a person gets that job. Write the steps in order, from ordinary person to running the country.

Spec: `{"steps":4,"orient":"across","caption":"How a person gets that job"}`

**`how-a-law-is-made`** · **NEW** · form `flow-steps` · page `government`
`tags: governance, civic-process`

> **Follow a law from an idea to a rule**
> Find out how something becomes a law in this country. Follow it through four boxes, from somebody's idea to the thing everybody has to obey, and write in each box who has to say yes.

Spec: `{"steps":4,"orient":"across","caption":"From an idea to a law"}`

**`law-you-notice`** · **KEEP** · form `differences` · page `government`
`tags: governance, daily-life` · `mode: us-contrast`

> **Find three surprising rules**
> Find three laws in this country that are different from where you live, and write each one next to how it works where you live. Then find one rule that is the same in both places.

Spec: `{"columns":["There","Here"],"rows":3,"shared":1}`

**`who-can-vote`** · **UPDATE** · form `differences` · page `government`
`tags: governance, civic-process, who-gets-less` · `mode: us-contrast`

> **Find out who gets a say**
> Find three things about voting there: who is allowed to, how old you have to be, and how often they vote. Write each one next to how it works where you live. Then find the one thing about voting that has not changed between them.

Spec: `{"columns":["There","Here"],"rows":3,"shared":1}`

**`is-the-law-kept`** · **NEW** · form `table-3` · page `government`
`tags: who-gets-less, governance, work-and-money`

> **Find out whether the law is kept**
> Find three things the law there is supposed to protect: children not working, a wage a job must pay, a day off in the working week, clean water, a school every child may attend. For each one, write what the law says, then find out what actually happens — and write down how you know.

Spec: `{"columns":["What the law says","What actually happens","How you know"],"rows":3}`

**`if-you-break-a-rule-there`** · **NEW** · form `table-3` · page `government`
`tags: governance, who-gets-less, civic-process` · `mode: us-contrast`

> **Find out what happens if you break a rule there**
> Find three things that are against the law in this country — a small one, a middle one, and a serious one. For each, write what happens to a person who does it and who decides.

Spec: `{"columns":["What is against the law","What happens to you","Who decides"],"rows":3}`

**`whats-in-the-news`** · **KEEP** · form `lines-4` · page `government`
`tags: governance, city-life` · `mode: personal-voice`

> **Find out what they are talking about**
> Find a newspaper or news site published in this country and read one headline from this month — a machine translation is fine, and the odd broken sentence is part of it. Write what happened in your own words, the way you would tell it to somebody at dinner.

Spec: `{"lines":4}`

**`what-they-plan-next`** · **NEW** · form `bullets` · page `government`
`tags: future-plans, governance`

> **What they say they are trying to do**
> Find this country's own plan for the next ten years — governments publish them and give them names. Write five things it says the country is trying to have done, one to a bullet, in the plan's own order. If they have not published one, find the last speech their leader gave about the future and use that. Then put a star next to the one you do not think will happen.

Spec: `{"items":5,"marker":"bullet","caption":"Five things this country says it is trying to do"}`

**`who-speaks-up-there`** · **NEW** · form `bullets` · page `government`
`tags: advocacy, governance, who-gets-less` · `mode: personal-voice`

> **Find the people asking for something**
> Find a group in this country that is asking their government to change something — for farmers, disabled people, a language, a river, people with no house. Write four things that group is asking for, one to a bullet. If nobody there is allowed to ask their government for anything in public, find somebody outside the country asking on their behalf, and write down what they are asking for.

Spec: `{"items":4,"marker":"bullet","caption":"Four things this group is asking for"}`

**`what-they-do-for-you`** · **NEW** · form `bullets` · page `government`
`tags: public-services, governance, public-money` · `mode: us-contrast`

> **Find out what the government does for a family**
> Find out what a family there gets without paying for it directly: a doctor, a fire truck, someone to take the trash, help if the money runs out, a road to the house, water. Write five things a family there can count on, one to a bullet, and put a star next to any that a family here would have to pay for.

Spec: `{"items":5,"marker":"bullet","caption":"Five things a family there can count on"}`

**`who-comes-when-it-burns`** · **NEW** · form `differences` · page `government`
`tags: public-services, infrastructure` · `mode: us-contrast`

> **Find out who comes when something goes wrong**
> Find out who turns up there if a house catches fire, if somebody is hurt and needs a hospital, and if somebody is in danger. Write each one next to who would come to our house. Then write the one thing that works the same way in both places.

Spec: `{"columns":["There","Here"],"rows":3,"shared":1}`

**`help-when-money-runs-out`** · **NEW** · form `table-3` · page `government`
`tags: public-services, public-money, who-gets-less`

> **Find out what happens when a family runs out of money**
> Find three kinds of help a family with no money can get in this country — food, rent, a payment for children, work training, a place to sleep. For each one, write who is allowed to have it and who pays for it: the government, a church, a charity, nobody.

Spec: `{"columns":["The help","Who can get it","Who pays for it"],"rows":3}`

**`what-they-are-working-on`** · **NEW** · form `box-note` · page `government`
`tags: science-research, future-plans`

> **Find what their scientists are building**
> Find out what people in this country are researching or building right now: a rocket, a telescope, a seed bank, a medicine, a machine that thinks, a way to catch water. Draw the thing, then write who is paying for it and what they hope it does. If nothing there is big enough to make the news, find out what they are studying about their own land — a crop, a disease, a fish count.

Spec: `{"caption":"What they are building or studying","lines":2}`

#### Money, work, and who is actually paid

**`made-here`** · **KEEP** · form `flow-steps` · page `money`
`tags: trade, work-and-money` · `mode: hands-on`

> **Find something made there**
> Find one thing this country makes and sells to the rest of the world. Check your own house for it first. Draw the trip it takes in four steps, from where it starts to somebody's house — and if you found one at home, that house is the last box.

Spec: `{"steps":4,"orient":"across","caption":"From there to here"}`

**`where-the-price-goes`** · **NEW** · form `bar-graph` · page `money`
`tags: who-owns-it, trade, who-gets-less` · `mode: us-contrast`

> **Find out who gets the money**
> Pick one thing this country sells to the rest of the world — coffee, cocoa, cobalt, cotton, bananas, cut flowers. Out of every hundred dollars a shopper pays for it, find how much reaches the farmer or miner, how much the company keeps, how much goes on shipping, and how much the shop keeps. Draw a bar for each. If nobody has worked it out for this country, use the closest country that sells it.

Spec: `{"bars":4,"orient":"horizontal","scale_marks":5,"axis_label":"Out of every $100 a shopper here pays","caption":"The farmer or miner  ·  The company  ·  Shipping  ·  The shop"}`

**`the-company-that-got-caught`** · **NEW** · form `timeline` · page `money`
`tags: who-owns-it, damage-and-repair, advocacy`

> **Find a company that got caught**
> Find one time a company — theirs, or a foreign one working there — did something to this country people are still angry about: a spill, a collapse, a river, a wage, a forest, a mine. Mark three moments on the line: when it started, when people found out, and what happened since. If you cannot find one, find the biggest company there, who owns it, and mark three big dates in its life instead.

Spec: `{"ticks":3,"unit":"years","ends":["It started","Now"]}`

**`the-work-nobody-wants`** · **NEW** · form `table-3` · page `money`
`tags: who-gets-less, work-and-money, forced-movement`

> **Find out who does the work nobody there wants**
> Find three jobs in this country that people there try not to do — dangerous, filthy, badly paid, or done out of sight. For each one write who actually does it — a particular group of people, people from another country, women, children — and what it pays.

Spec: `{"columns":["The job","Who actually does it","What it pays"],"rows":3}`

**`who-they-trade-with`** · **NEW** · form `list-n` · page `money`
`tags: trade, who-owns-it` · `mode: us-contrast`

> **Who buys what they sell**
> Find the five countries this country sells the most to. List them biggest first, and put a star next to ours if it is on the list.

Spec: `{"items":5,"marker":"number","caption":"Biggest buyer first"}`

**`made-because-they-needed-it`** · **NEW** · form `box-beside` · page `money`
`tags: science-research, infrastructure`

> **Find something they made because they needed it**
> Find one thing invented, designed or first made in this country to solve a problem people there actually had — a stove, a pump, a crop, a boat built for their water, a way of paying without a bank. Draw it, then write what the problem was and whether anybody outside the country uses it now.

Spec: `{"caption":"Sketch it","lines":3}`

**`what-their-money-goes-to`** · **NEW** · form `bar-graph` · page `money`
`tags: public-money, governance, public-services` · `mode: us-contrast`

> **Where their government's money goes**
> Out of every hundred dollars this country's government spends, find out roughly how much goes to schools, to hospitals and doctors, to soldiers, and to roads and building. Draw a bar for each one. If they do not publish it, use the World Bank's numbers and write on the sheet that that is where they came from.

Spec: `{"bars":4,"orient":"horizontal","scale_marks":5,"axis_label":"Out of every 100 dollars they spend","caption":"Schools  ·  Health  ·  Soldiers  ·  Roads and building"}`

**`what-work-pays`** · **KEEP** · form `bar-graph` · page `money`
`tags: work-and-money, public-money` · `mode: us-contrast`

> **What a week of work buys**
> Find out what an ordinary job there pays in a week. Then find what bread, a bus ride and a pair of shoes cost there. Work out how many of each a week's pay buys, and draw a bar for each one.

Spec: `{"bars":3,"orient":"horizontal","scale_marks":5,"axis_label":"What one week of pay buys","caption":"Loaves of bread  ·  Bus rides  ·  Pairs of shoes"}`

**`your-money-there`** · **NEW** · form `split-two` · page `money`
`tags: public-money, travel` · `mode: measurement, us-contrast`

> **Turn your money into theirs**
> Find out what their money is called and what one US dollar is worth in it today. Then write three amounts in their money and in ours: one dollar, everything you have saved right now, and what you would need to buy lunch for our whole family there.

Spec: `{"columns":["In their money","In US dollars"],"rows":3}`

**`their-working-day`** · **NEW** · form `clock-pair` · page `money`
`tags: work-and-money, daily-life` · `mode: us-contrast, measurement`

> **Find out how long their working day is**
> Find out what time an ordinary job there starts and what time it finishes. Draw the hands on both clocks and write both times in digits, then write how many hours that is in a week there and how many hours a week a full job is here.

Spec: `{"faces":2,"captions":["When work starts","When work ends"],"digital_line":true,"lines":2}`

#### The land

**`landforms`** · **KEEP** · form `label-it` · page `land`
`tags: landform, city-life` · `mode: map-work`

> **Describe the land**
> Look at the land: mountains, desert, coastline, plains. Draw the whole country big enough to fill the page, then label six things on it — the highest part, the driest part, where the water is, where nobody lives, where most people do live, and the edge you would notice first if you arrived.

Spec: `{"caption":"Draw it big, then label the parts","lines":0,"callouts":6}`

**`river-that-matters`** · **KEEP** · form `map-marks` · page `land`
`tags: water, landform, city-life` · `mode: map-work`

> **Follow their biggest river**
> Find the longest river in the country. Draw its whole path on the map, then number and name three places on it: where it starts, where it ends, and one town that sits on it. If the country's biggest water is a lake instead, draw the lake and the rivers that feed it.

Spec: `{"caption":"Their biggest river","pins":3}`

**`highest-point`** · **UPDATE** · form `scale-strip` · page `land`
`tags: altitude, landform` · `mode: measurement`

> **How far from the bottom to the top**
> Find the highest point in this country and the lowest — some countries have ground that sits below the sea. Mark both on the scale, and mark sea level between them. Then write which of the two more people live near, and why.

Spec: `{"mode":"scale","orient":"vertical","marks":3,"unit":"feet above sea level","captions":["Their highest point","Sea level","Their lowest ground"]}`

**`how-high-they-live`** · **NEW** · form `scale-strip` · page `land`
`tags: altitude, city-life` · `mode: measurement, us-contrast`

> **How high up is their capital?**
> Find out how many feet above sea level their capital city sits, and how high our own town sits. Mark both on the scale and label each mark.

Spec: `{"mode":"scale","orient":"vertical","marks":2,"unit":"feet above sea level","captions":["Their capital","Our town"]}`

**`where-the-ground-shakes`** · **NEW** · form `map-marks` · page `land`
`tags: landform, damage-and-repair, infrastructure` · `mode: map-work`

> **Find where the ground is not still**
> Find out whether this country gets earthquakes or has volcanoes. Mark three places on the map and name them: one volcano or fault line, the last place a big quake hit, and the nearest big city to it. If the ground there never moves, mark the three places most at risk from flood instead.

Spec: `{"caption":"Where the ground is not still","pins":3}`

**`where-the-food-grows`** · **NEW** · form `map-marks` · page `land`
`tags: agriculture, landform, everyday-food` · `mode: map-work`

> **Map where their food comes from**
> Mark three places on the map and name them: where their main crop is grown, where animals are kept or fish are caught, and the city most of that food is carried to.

Spec: `{"caption":"Where their food comes from","pins":3}`

**`what-they-grow`** · **KEEP** · form `fields` · page `land`
`tags: agriculture, everyday-food, trade`

> **Find out what they grow**
> Find the crop this country grows the most of. Find out which part of the country grows it, and one thing people there make or cook with it.

Spec: `{"captions":["The crop","Where in the country it grows","What they make with it"],"lines_each":1}`

**`what-the-land-is-used-for`** · **NEW** · form `pictograph` · page `land`
`tags: agriculture, landform, wildlife` · `mode: demographics-stat`

> **What the land is doing**
> Out of every hundred acres of this country, find out how many are farmed and how many are forest or wild. Color a row for each and label the rows.

Spec: `{"rows":2,"per_row":10,"key":"Each figure = 10 acres out of every 100","label_lines":true}`

**`under-the-ground`** · **KEEP** · form `specimen-boxes` · page `land`
`tags: who-owns-it, trade, landform`

> **Find out what they dig up**
> Find out what people take out of the ground there: oil, copper, salt, diamonds, stone, sand. Draw four of them and write what each one gets used for. If they only dig up one or two, fill the empty boxes with what they have to buy from somewhere else instead.

Spec: `{"boxes":4,"caption":"What comes out of their ground","label_lines":1,"circle_one":false}`

**`water-to-the-tap`** · **NEW** · form `flow-steps` · page `land`
`tags: water, infrastructure, public-services, daily-life`

> **Follow their water home**
> Find out where drinking water comes from in this country. Fill the four boxes from where it falls or is pumped through to somebody's cup, and mark the box where it gets cleaned — or write that there isn't one.

Spec: `{"steps":4,"orient":"across","caption":"From the sky to the cup"}`

**`where-the-trash-goes`** · **NEW** · form `flow-steps` · page `land`
`tags: public-services, damage-and-repair, city-life`

> **Follow their garbage**
> Find out what happens to household rubbish there. Put four boxes between the bin in somebody's kitchen and wherever it finally stops, and write in the box where anything gets sorted or reused — or write on the last box that nothing does.

Spec: `{"steps":4,"orient":"across","caption":"From the bin to wherever it stops"}`

**`desert-shall-blossom`** · **KEEP** · form `then-now` · page `land`
`tags: damage-and-repair, water, landform` · `mode: scripture-read`

> **Find the land that needs healing**
> Find the driest, most worn-out or most polluted place in this country and look at a photo of it. Draw what you see. Then read Isaiah 35:1-2 and draw that same place the way it will look when the land is healed.

Spec: `{"captions":["How it looks now","When the land is healed"],"lines_each":2}`

#### Weather and water

**`weather-there-now`** · **KEEP** · form `scale-strip` · page `climate`
`tags: weather-pattern` · `mode: measurement, us-contrast`

> **Check the weather there today**
> Look up the temperature in their capital city right now and the temperature where you are. Mark both on the thermometer and label each mark.

Spec: `{"mode":"scale","orient":"vertical","marks":2,"unit":"°F","captions":["Their weather","Our weather"]}`

**`weather-that-hits`** · **KEEP** · form `fields` · page `climate`
`tags: weather-pattern, damage-and-repair, sun-and-seasons`

> **Find the weather they brace for**
> Find out what kind of big weather this country gets: hurricanes, monsoons, drought, blizzards, floods. Find what time of year it comes and one way people get ready.

Spec: `{"captions":["What kind of big weather","What time of year it comes","One way people get ready"],"lines_each":1}`

**`rain-in-a-year`** · **NEW** · form `scale-strip` · page `climate`
`tags: weather-pattern, water` · `mode: measurement, us-contrast`

> **How wet is it there?**
> Find out how many inches of rain fall in their capital in a year, and how many fall where we live. Mark both on the scale and label each mark.

Spec: `{"mode":"scale","orient":"vertical","marks":2,"unit":"inches of rain a year","captions":["Their year","Our year"]}`

**`rain-through-the-year`** · **NEW** · form `bar-graph` · page `climate`
`tags: weather-pattern, water, agriculture, sun-and-seasons`

> **When their rain comes**
> Find out how much rain falls in their capital in January, in April, in July and in October. Draw a bar for each month, then write underneath which of those months a farmer there would be watching. If their capital is not where the farming is, use the biggest farming town instead and say which one.

Spec: `{"bars":4,"orient":"vertical","scale_marks":5,"axis_label":"Inches of rain in the month","caption":"January  ·  April  ·  July  ·  October"}`

**`climate-bands`** · **NEW** · form `map-marks` · page `climate`
`tags: weather-pattern, landform, city-life` · `mode: map-work`

> **Put their weather on the map**
> Find a climate map of this country. Shade the different weather bands onto the map, then mark and name four of them: the wettest part, the driest part, the part where snow falls — or write that none of it does — and the band most people actually live in.

Spec: `{"caption":"Their weather, band by band","pins":4}`

#### Living things

**`wild-animal`** · **KEEP** · form `box-note` · page `ecology`
`tags: wildlife, landform`

> **Draw a wild animal**
> Find one wild animal that lives in this country but not where you live. Draw it and write one fact about where it lives.

Spec: `{"caption":"An animal that lives there and not here","lines":2}`

**`animal-in-trouble`** · **KEEP** · form `fields` · page `ecology`
`tags: extinction, wildlife, damage-and-repair`

> **Find an animal in trouble**
> Find one animal from this country that scientists say is endangered. Find out one reason it is disappearing and roughly how many are left.

Spec: `{"captions":["The animal","Why it is disappearing","Roughly how many are left"],"lines_each":1}`

**`the-one-that-is-gone`** · **NEW** · form `then-now` · page `ecology`
`tags: extinction, wildlife, damage-and-repair`

> **The animal that is not there anymore**
> Find an animal that lived in this country within the last few hundred years and is now gone for good — one people actually saw, not one dug out of rock. Draw it in the place it lived, then draw that same place today, and write on the arrow the year the last one was seen. If nothing there has gone for good, find the one that is down to its last few hundred and draw the place it used to range.

Spec: `{"captions":["When it was still here","That same place now"],"lines_each":2,"middle":"The year the last one was seen"}`

**`wild-place-protected`** · **KEEP** · form `box-note` · page `ecology`
`tags: wildlife, damage-and-repair, landform`

> **Find their biggest wild place**
> Find the biggest national park or nature reserve in this country. Draw what it looks like, then name one animal that is safer because the park is there and write what it was in danger from.

Spec: `{"caption":"Their biggest wild place","lines":2}`

**`tree-that-grows`** · **KEEP** · form `specimen-boxes` · page `ecology`
`tags: wildlife, agriculture, everyday-food`

> **Find a tree that grows there**
> Find one tree or plant that grows well in this country. Draw a leaf from it, draw its fruit or its seed, and draw one thing people there make or eat from it.

Spec: `{"boxes":3,"caption":"The leaf, the fruit, and what they make","label_lines":1,"circle_one":false}`

**`plants-that-heal`** · **NEW** · form `specimen-boxes` · page `ecology`
`tags: health, folklore-belief, wildlife`

> **Find what they grow for medicine**
> Find four plants that grow in this country that people there use as medicine — for a fever, a cut, a cough, a stomach. Draw each one and write what it is used for underneath. Circle any that a doctor here would also hand you.

Spec: `{"boxes":4,"caption":"Four plants and what they are for","label_lines":1,"circle_one":true}`

#### Who the people are

**`who-lives-there`** · **KEEP** · form `hundred-people` · page `people`
`tags: who-gets-less, migration` · `mode: demographics-stat`

> **Who lives there?**
> Find out which groups of people make up this country and roughly what share each one is. Color your hundred people to match and write the key yourself. If the country doesn't count its people this way at all, write that on the key instead.

Spec: `{"rows":10,"per_row":10,"key_rows":4,"caption":"If this country were 100 people"}`

**`the-group-that-gets-less`** · **NEW** · form `bullets` · page `people`
`tags: who-gets-less, advocacy` · `mode: demographics-stat`

> **Find out who there gets less**
> In most countries one group gets less than the others — less school, less money, less land, less say, less safety. Find out who that is in this country and write four things they get less of, one to a bullet. If people there disagree about whether it is happening at all, write what each side says instead.

Spec: `{"items":4,"marker":"bullet","caption":"Four things one group there gets less of"}`

**`what-work-they-do`** · **NEW** · form `hundred-people` · page `people`
`tags: work-and-money, agriculture, city-life` · `mode: demographics-stat`

> **What a hundred of them do all day**
> If this country were a hundred working people, find out how many farm or fish, how many make things in factories or workshops, how many sell things or serve people, and how many do something else. Color your hundred to match and write the key yourself.

Spec: `{"rows":10,"per_row":10,"key_rows":4,"caption":"If a hundred people there went to work"}`

**`the-job-a-kid-does`** · **NEW** · form `box-note` · page `people`
`tags: who-gets-less, work-and-money, schooling`

> **Draw a kid there at work**
> Find out what work children there actually do — in a field, a workshop, a mine, a market, a house that is not theirs. Draw one of them doing it, then write how old they usually are and what they are not doing while they do it. If children there do not work, find out what stopped it and what year.

Spec: `{"caption":"A kid there, at work","lines":2}`

**`how-many-languages`** · **KEEP** · form `table-3` · page `people`
`tags: language, who-gets-less` · `mode: demographics-stat`

> **Count their languages**
> Find four languages actually spoken there, not just the official one: the official one, the one most people speak at home, and two more — including one only a few thousand people still speak.

Spec: `{"columns":["The language","Who speaks it","Roughly how many"],"rows":4}`

**`most-common-names`** · **NEW** · form `table-3` · page `people`
`tags: names, language, religion` · `mode: demographics-stat`

> **The names half of them have**
> Find the most common name for a man there, the most common for a woman, and the most common family name. For each, write roughly how many people carry it and where the name came from — a saint, a king, a job, a place, a word that means something. If nobody counts names there, use the phone book of their biggest city and say that is what you used.

Spec: `{"columns":["The name","Roughly how many","Where it came from"],"rows":3}`

**`family-size`** · **UPDATE** · form `differences` · page `people`
`tags: family, daily-life` · `mode: demographics-stat, us-contrast`

> **How big is a family there?**
> Find the average number of children in a family there and write it next to the number in our house, along with two more things about how families there are put together — who else lives in the house, who looks after the small ones. Then write the one thing about families that turns out to be the same in both houses.

Spec: `{"columns":["Families there","Our house"],"rows":3,"shared":1}`

**`young-or-old`** · **KEEP** · form `bar-graph` · page `people`
`tags: health, schooling` · `mode: demographics-stat`

> **A country of kids or of grandparents?**
> Find out how many people out of every hundred there are under 15, how many are between 15 and 65, and how many are over 65. Draw a bar for each.

Spec: `{"bars":3,"orient":"vertical","scale_marks":5,"axis_label":"Out of every 100 people","caption":"Under 15  ·  15 to 65  ·  Over 65"}`

**`how-long-they-live`** · **KEEP** · form `figure-anchor` · page `people`
`tags: health, who-gets-less` · `mode: demographics-stat, us-contrast`

> **How long people live**
> Find the average life expectancy there. Write it in the box, then write ours underneath and one reason for the gap between them.

Spec: `{"caption":"Life expectancy","unit":"years","anchor_prompt":"Ours is… and one reason for the gap"}`

**`who-can-read`** · **NEW** · form `pictograph` · page `people`
`tags: schooling, who-gets-less` · `mode: demographics-stat`

> **How many of them read**
> Out of every hundred grown men in this country, find out how many can read and write. Then find the same number for grown women. Color a row for each and label the rows. If nearly everybody there can read, find the nearest country where that is not true, put its numbers on the second row, and write both names on the key.

Spec: `{"rows":2,"per_row":10,"key":"Each figure = 10 grown-ups out of every 100","label_lines":true}`

**`who-finishes-school`** · **KEEP** · form `pictograph` · page `people`
`tags: schooling, who-gets-less` · `mode: demographics-stat`

> **How far does learning go?**
> Find out how many kids out of every hundred there finish secondary school, and how many go on to university. Color one row for each and label the rows.

Spec: `{"rows":2,"per_row":10,"key":"Each figure = 10 kids out of 100","label_lines":true}`

**`how-they-learn`** · **KEEP** · form `bullets` · page `people`
`tags: schooling, public-money, family`

> **Find out how kids there learn**
> Find out whether school is free there, how many years a kid is required to go, and what it costs a family who has to pay. Then find out whether teaching your own children at home is allowed there, and roughly how many families do it. Write five things you found out, one to a bullet.

Spec: `{"items":5,"marker":"bullet","caption":"Five things about how kids there learn"}`

**`when-you-are-old-enough`** · **NEW** · form `differences` · page `people`
`tags: governance, daily-life, schooling` · `mode: us-contrast`

> **How old you have to be there**
> Find out how old you have to be in this country to leave school, to have a job, and to drive. Write each one next to how old you have to be here. Then find the one age that is the same on both sides.

Spec: `{"columns":["There","Here"],"rows":3,"shared":1}`

**`how-you-get-a-house`** · **NEW** · form `flow-steps` · page `people`
`tags: housing, work-and-money, family`

> **Find out how a family gets a house there**
> Find out how an ordinary family there comes to have a home: saving for it, borrowing from a bank, inheriting it, renting it, or building it themselves out of what is nearby. Take the five boxes from no house to living in it for the most common way, and write in each box who is paying.

Spec: `{"steps":5,"orient":"across","caption":"From no house to living in it"}`

**`who-owns-the-roof`** · **NEW** · form `pictograph` · page `people`
`tags: housing, who-gets-less` · `mode: demographics-stat, us-contrast`

> **How many of them own their home**
> Out of every hundred families there, find out how many own the home they live in rather than renting it. Then find the same number for families here. Color a row for each and label the rows.

Spec: `{"rows":2,"per_row":10,"key":"Each figure = 10 families out of every 100","label_lines":true}`

**`who-came-and-who-left`** · **KEEP** · form `fields` · page `people`
`tags: migration, work-and-money`

> **Who came and who left**
> Find out where people there have moved from, and where people from there have moved to. Name the two countries most tied to this one by people moving, and one reason they went.

Spec: `{"captions":["They came from","They moved to","Why they went"],"lines_each":1}`

**`who-they-took-in`** · **NEW** · form `table-3` · page `people`
`tags: forced-movement, migration, advocacy`

> **Find out who ran to this country**
> Find out whether people from anywhere else have run to this country to be safe. Name three groups who did, and for each write what they were running from and roughly how many came. If it went the other way and people ran out of here instead, do it that way round and say so on the sheet.

Spec: `{"columns":["Who came","What they were running from","Roughly how many"],"rows":3}`

**`where-they-go-when-they-go`** · **NEW** · form `table-3` · page `people`
`tags: travel, migration, city-life`

> **Find out where they go**
> Find three places people from this country go when they leave home: the country most of them travel to, the city inside their own country most people head for, and one place they go for work. For each, write who goes and why. If most people there never leave the district they were born in, name the three places they do go — a market town, a shrine, a hospital — and write that instead.

Spec: `{"columns":["Where they go","Who goes","Why"],"rows":3}`

---

#### The pinned slot

**`wow-fact`** · **UPDATE** · form `lines-4` · page `culture` · tier `fixed`
`tags: story-telling`

> **Find one wow fact**
> Dig until you find one fact about this country that makes you say "wow." Write it in your own words.

Spec: `{"lines":4}`

Pinned to week 2 and never drawn — §3, *The pinned slots*. It is the one prompt with no
subject, which makes it on-theme for no focus and every focus at once, and a weighted draw
the wrong instrument for it.

---

### Week 3 — Deep Dive

Sixty-nine prompts, one of them the pinned `cook-it`. Like week 2's, the heading is the
prompt's natural half rather than a draw pool (§3).

Where week 2 asks what a country *is*, week 3 asks what a Tuesday there is like. A
*find out* prompt in week 3 competes with sixty others; a *go and do it* prompt competes
with almost none, which is the direction this week grows in.

#### An ordinary day

**`kid-life`** · **KEEP** · form `timeline` · page `people`
`tags: daily-life, schooling, family`

> **A day in their life**
> Walk through an ordinary day for a kid your age there, from waking up to going to bed. Mark five moments on the line and write what is happening at each one.

Spec: `{"ticks":5,"unit":"clock","ends":["Wake up","Bedtime"]}`

**`what-a-kid-carries`** · **KEEP** · form `bullets` · page `people`
`tags: daily-life, schooling` · `mode: us-contrast`

> **What's in their bag**
> Find out what a kid your age there carries with them on an ordinary day. List five things, one to a bullet. If one of them is something you have never had to carry, put a star next to it.

Spec: `{"items":5,"marker":"bullet","caption":"Five things a kid there carries"}`

**`their-rest-day`** · **UPDATE** · form `week-strip` · page `people`
`tags: sabbath, daily-life, religion`

> **Find their day off**
> Find out which days are the weekend in this country and which day people rest — and find out which day they call the first day of the week, because it is not the same everywhere. Shade the days most people do not work, then write what closes on their rest day, if anything does, and which day their week starts on.

Spec: `{"labels":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"marker":"box","orient":"across","caption":"Shade the days most people do not work"}`

**`house-they-live-in`** · **KEEP** · form `label-small` · page `people`
`tags: housing, weather-pattern, crafts`

> **Draw an ordinary house**
> Find a picture of an ordinary home in this country, not a palace. Draw it and label three things the weather or the land made necessary.

Spec: `{"caption":"Draw it, then label the parts","callouts":3}`

**`what-they-can-plug-in`** · **KEEP** · form `bar-graph` · page `people`
`tags: infrastructure, daily-life` · `mode: demographics-stat`

> **What they can plug in**
> Out of every hundred people there, find out how many have electricity at home, how many have a phone of their own, and how many can get on the Internet. Draw a bar for each.

Spec: `{"bars":3,"orient":"vertical","scale_marks":5,"axis_label":"Out of every 100 people","caption":"Electricity  ·  A phone  ·  The Internet"}`

**`getting-around`** · **KEEP** · form `figure-anchor` · page `people`
`tags: travel, infrastructure, daily-life` · `mode: measurement, us-contrast`

> **Find out how they get around**
> Find out how people there travel to work, to market and to school. Find out how long an ordinary kid's trip takes and write it in the box, then write the longest trip anyone in our house makes in a week.

Spec: `{"caption":"An ordinary trip there","unit":"minutes","anchor_prompt":"Our longest weekly trip is…"}`

**`life-outdoors`** · **KEEP** · form `box-beside` · page `people`
`tags: play-and-sport, landform, daily-life`

> **Find what they do outside**
> Find out what people there do outdoors: hiking, fishing, herding, surfing, skiing. Pick one and draw somebody doing it, then write where in the country people do it and why the land there suits it.

Spec: `{"caption":"Sketch it","lines":3}`

**`game-kids-play`** · **KEEP** · form `list-n` · page `people`
`tags: play-and-sport, daily-life` · `mode: hands-on`

> **Learn a game kids play there**
> Find a game kids play in this country. Write the rules in three lines, then go play one round of it.

Spec: `{"items":3,"marker":"number"}`

**`what-they-keep`** · **NEW** · form `specimen-boxes` · page `people`
`tags: animals-with-people, daily-life, agriculture`

> **Find out what animals live with them**
> Find out what animals people there keep — in the house, in the yard, on the roof, tied up outside. Draw four of them and write under each whether it is a pet, a worker, or dinner. Circle the one that would surprise somebody here.

Spec: `{"boxes":4,"caption":"Four animals that live with people there","label_lines":1,"circle_one":true}`

**`street-animals`** · **NEW** · form `box-beside` · page `people`
`tags: animals-with-people, city-life, daily-life`

> **Find out who the animals in the street belong to**
> Find out what animals walk around loose in a town there — dogs, cats, cows, goats, monkeys, chickens. Draw one where you would actually see it, then write who feeds it, whether anybody owns it, and what happens to it if it gets sick. If nothing runs loose there, find out what stops it.

Spec: `{"caption":"Draw it where you would see it","lines":3}`

**`find-them-near-us`** · **NEW** · form `box-beside` · page `people`
`tags: migration, everyday-food` · `mode: hands-on, personal-voice`

> **Find this country near our house**
> Find the closest place to us run by people from this country, or selling what they sell — a restaurant, a shop, a church, a grocery aisle, a market stall. Draw the sign or the front of it, then write how far away it is and one thing you could go and buy there this week. If there is nothing within a drive, find the nearest city that has one and how far that is.

Spec: `{"caption":"Draw the sign or the front of it","lines":3}`

#### School, work, and getting by

**`what-every-kid-learns`** · **KEEP** · form `bullets` · page `people`
`tags: schooling, family`

> **What a kid there is expected to know**
> Find out what subjects kids there are taught between about six and eleven years old. Write five of them, one to a bullet. Then in the sixth bullet, write one thing families there teach their own children that nobody teaches in a school.

Spec: `{"items":6,"marker":"bullet","caption":"Five subjects, then one thing taught at home"}`

**`from-school-to-work`** · **NEW** · form `flow-steps` · page `people`
`tags: schooling, work-and-money, milestone`

> **From their first school day to a job**
> Find out how a kid there gets from the first day of school to a job. Draw the five steps in order — the schools, the tests, the training — and write how old a person is at each step.

Spec: `{"steps":5,"orient":"across","caption":"From the first day of school to a job"}`

**`first-money-they-earn`** · **NEW** · form `figure-anchor` · page `people`
`tags: work-and-money, schooling, who-gets-less` · `mode: us-contrast`

> **Find out how old they are when they start working**
> Find out how old most people there are when they start earning money — not the age the law allows, the age it actually happens. Write that age in the box, then write what the first job usually is and how old the youngest person in our house was when they first earned anything.

Spec: `{"caption":"Age most people there start earning","unit":"years old","anchor_prompt":"The first job is usually… and in our house…"}`

**`girls-and-women`** · **UPDATE** · form `differences` · page `people`
`tags: who-gets-less, schooling, work-and-money` · `mode: us-contrast`

> **Find out how girls grow up there**
> Find out what learning and work look like for girls and women in this country. Write three things next to how they are where you live. Then write the one thing that is no different at all.

Spec: `{"columns":["Girls there","Girls here"],"rows":3,"shared":1}`

**`getting-around-if-you-cant-walk`** · **NEW** · form `bullets` · page `people`
`tags: who-gets-less, infrastructure, advocacy`

> **Find out what an ordinary day costs somebody there in a wheelchair**
> Find out what a person there who cannot walk, cannot see or cannot hear runs into on an ordinary day — the buses, the doorways, the school, the job, whether anybody is required by law to make it easier. Write four things you found, one to a bullet.

Spec: `{"items":4,"marker":"bullet","caption":"Four things a disabled person there runs into"}`

**`if-you-get-sick`** · **NEW** · form `differences` · page `people`
`tags: health, public-services, who-gets-less` · `mode: us-contrast`

> **What happens if you get sick there**
> Find out where a family there goes when a child is sick, how far they travel to get there, and who pays for it. Write each one next to how it works at our house. Then write the one part of it that goes the same way in both houses.

Spec: `{"columns":["If you get sick there","If we get sick"],"rows":3,"shared":1}`

**`what-they-plow-with`** · **NEW** · form `label-small` · page `people`
`tags: agriculture, crafts, infrastructure`

> **Draw the tool they work with**
> Find the machine or tool people there use to work the land or move what they grow — an ox and plow, a rice thresher, a tractor, a fishing boat, a donkey cart. Draw it and label three parts, and write next to each what that part does.

Spec: `{"caption":"Draw it, then label three parts","callouts":3}`

**`where-you-buy-clothes`** · **NEW** · form `table-3` · page `people`
`tags: clothing, city-life, work-and-money`

> **Find out where you would go for clothes**
> Find out where people there actually get their clothes: a market stall, a tailor who measures you, a shop in a mall, secondhand from somewhere else, or made at home. Pick four things — shoes, a coat, everyday clothes, and something for a wedding or a feast — and write where you would go for each and who made it.

Spec: `{"columns":["What you need","Where you would go","Who made it"],"rows":4}`

**`have-they-been-away`** · **NEW** · form `pictograph` · page `people`
`tags: travel, migration` · `mode: demographics-stat, us-contrast`

> **How many of them have left**
> Out of every hundred people there, find out roughly how many have ever traveled to another country. Then find the same number for here. Color a row for each and label the rows. If nobody counts it there, count passports instead and write that on the key.

Spec: `{"rows":2,"per_row":10,"key":"Each figure = 10 people out of every 100","label_lines":true}`

**`city-and-country`** · **KEEP** · form `pictograph` · page `people`
`tags: city-life, agriculture` · `mode: demographics-stat`

> **City or countryside?**
> Find out how many people out of every hundred there live in cities and how many live out in the countryside. Color a row for each, then label one row with their biggest city and the other with the part of the country most of the farming happens in.

Spec: `{"rows":2,"per_row":10,"key":"Each figure = 10 people out of 100","label_lines":true}`

**`city-then-and-now`** · **NEW** · form `then-now` · page `people`
`tags: city-life, milestone, infrastructure`

> **The same street, a hundred years apart**
> Find two photographs of the same place in one of their cities, about a hundred years apart. Draw what you see in each one, and write underneath what is gone and what is still there. If nobody photographed their cities that long ago, use a painting or a drawing for the first panel and say which.

Spec: `{"captions":["A hundred years ago","The same place today"],"lines_each":2}`

**`who-is-famous`** · **KEEP** · form `box-beside` · page `people`
`tags: music-and-art, play-and-sport, story-telling`

> **Find someone everyone knows**
> Find one person from this country that almost everyone there would recognize. Draw the thing they are known for — the ball, the instrument, the book, the medal — then write who they are and what they did.

Spec: `{"caption":"Sketch it","lines":3}`

#### Names, words and what is funny

**`a-whole-name`** · **NEW** · form `label-small` · page `language`
`tags: names, language, family`

> **Take a name apart**
> Find a real full name from this country — a president, a writer, a footballer, a singer. Write it big enough to fill the box, then label three parts: the name their family chose for them, a name they got from a parent or a place, and one part we do not have at all — a father's name, a mother's family name, a clan, a title. Then put a star on the part a teacher there would call out first.

Spec: `{"caption":"Write one whole name big, then label three parts","callouts":3}`

**`what-they-name-babies-now`** · **NEW** · form `list-n` · page `people`
`tags: names, family, daily-life` · `mode: us-contrast`

> **What they are calling babies this year**
> Find the five most popular names for babies born there in the last year or two. List them most popular first, and circle any you have heard on a real person here. If they have not published a list, find the five most common names in one school class there instead.

Spec: `{"items":5,"marker":"number","circle_one":true,"caption":"Most popular first — circle any you have heard here"}`

**`their-alphabet`** · **NEW** · form `specimen-boxes` · page `language`
`tags: language, names, crafts` · `mode: hands-on`

> **Copy out their letters**
> Find out what writing people there use. Copy four letters, characters or marks from it as carefully as you can, and write under each one what sound it makes. Circle the one that makes a sound English does not have. If they write in our alphabet, find the letters or marks they use that we do not.

Spec: `{"boxes":4,"caption":"Four of their characters and the sound each one makes","label_lines":1,"circle_one":true}`

**`word-they-have`** · **KEEP** · form `split-two` · page `language`
`tags: language, daily-life`

> **Find a word we don't have**
> Find two words in their language that take a whole sentence to say in English — a feeling, a kind of weather, a thing people do together, a time of day. Write each word the way they spell it, and next to it the sentence it takes us.

Spec: `{"columns":["Their word","What it takes us a sentence to say"],"rows":2}`

**`ask-for-the-bathroom`** · **NEW** · form `split-two` · page `language`
`tags: language, travel, daily-life` · `mode: hands-on`

> **Learn to ask for the things you would actually need**
> Learn to ask four things in their language: where the bathroom is, where the train or bus station is, how much something costs, and how to say you don't understand. Write each one the way they spell it and the way it sounds, then say all four out loud to somebody in this house.

Spec: `{"columns":["The way they spell it","The way it sounds"],"rows":4}`

**`what-makes-them-laugh`** · **NEW** · form `lines-4` · page `culture`
`tags: language, play-and-sport, story-telling` · `mode: personal-voice`

> **Find out what is funny there**
> Find a joke, a cartoon or a comedian from this country and work out why it is funny. You may need somebody to explain it — a joke that has to be explained is still a finding. Write the joke in your own words and what you had to know first for it to work.

Spec: `{"lines":4}`

#### Belief, legend, and the shape of their year

**`what-people-believe`** · **UPDATE** · form `table-3` · page `culture`
`tags: religion, migration, holiday-calendar`

> **Find the main religion**
> Find three faiths people keep in this country — or, if there is really only one, the one they keep and two they used to. For each, write when it first arrived there and name one day it keeps.

Spec: `{"columns":["The religion","When it arrived there","A day it keeps"],"rows":3}`

**`who-worships-what`** · **NEW** · form `hundred-people` · page `culture`
`tags: religion, who-gets-less` · `mode: demographics-stat`

> **A hundred of them, and what they believe**
> If this country were a hundred people, find out how many follow each faith there, and how many follow none. Color your hundred to match and write the key yourself, biggest group first.

Spec: `{"rows":10,"per_row":10,"key_rows":4,"caption":"If this country were 100 people"}`

**`place-of-worship`** · **KEEP** · form `box-note` · page `culture`
`tags: religion, crafts`

> **Draw where they worship**
> Find a church, mosque, temple or shrine in this country. Draw the outside, and write one line about what happens inside on their main day.

Spec: `{"caption":"Draw the outside","lines":2}`

**`sabbath-keepers-there`** · **KEEP** · form `fields` · page `culture`
`tags: sabbath, religion, christian-history`

> **Find who keeps the seventh day**
> Find out whether anyone in this country keeps a seventh-day Sabbath — Adventists, a Church of God, Jewish or Messianic congregations. Find what they are called there, roughly how many there are, and when and where they meet.

Spec: `{"captions":["What they are called there","Roughly how many","When and where they meet"],"lines_each":1}`

**`when-sabbath-starts`** · **NEW** · form `clock-pair` · page `culture`
`tags: sabbath, religion, sun-and-seasons` · `mode: measurement, us-contrast`

> **Find out when their Sabbath begins**
> Find what time the sun sets on Friday in their capital city, and what time it sets here. Draw the hands on both clocks and write both times in digits, then write one line about who is sitting down to rest there while we are still in the afternoon.

Spec: `{"faces":2,"captions":["Sunset there, Friday","Sunset here, Friday"],"digital_line":true,"lines":2}`

**`sun-up-sun-down`** · **NEW** · form `clock-pair` · page `culture`
`tags: sun-and-seasons, weather-pattern` · `mode: measurement, us-contrast`

> **Their shortest day**
> Find out what time the sun comes up and goes down in their capital on the shortest day of the year. Draw the hands on both clocks and write both times in digits, then write how many hours of daylight that leaves them and how many we get on ours.

Spec: `{"faces":2,"captions":["Sunrise, shortest day","Sunset, shortest day"],"digital_line":true,"lines":2}`

**`feast-they-keep`** · **UPDATE** · form `lines-8` · page `culture`
`tags: holiday-calendar, religion, agriculture` · `mode: scripture-read`

> **Find their harvest feast**
> Find the biggest harvest or thanksgiving festival in this country and what happens at it — what is cooked, what is carried, who comes. Read Zechariah 14:16. Then write five or six lines: what the feast is for now, which parts of it are about the harvest and which are about something else, and the part of it that could still be kept when all nations come up to keep the Feast.

Spec: `{"lines":8}`

**`nations-before-the-throne`** · **NEW** · form `lines-8` · page `culture`
`tags: religion, language` · `mode: scripture-read, personal-voice`

> **What this country brings**
> Read Revelation 7:9-10. Then write five or six lines about this country standing in that crowd: the language they would sing it in, the words for *salvation* and *our God* in that language, and the one thing you learned this month that you would miss if this country were not there.

Spec: `{"lines":8}`

**`bible-happened-here`** · **NEW** · form `storyboard` · page `culture`
`tags: christian-history, story-telling` · `mode: scripture-read`

> **Tell what happened here**
> Find something in the Bible that happened in this land or on its coast — a journey, a shipwreck, a letter written to it, a king who came from it. Tell the whole thing in six pictures, start to finish. If nothing in Scripture happened here, tell the story of how the Bible first arrived instead.

Spec: `{"panels":6}`

**`story-they-tell`** · **KEEP** · form `storyboard` · page `culture`
`tags: folklore-belief, story-telling`

> **Find a story they tell**
> Find a folk tale, legend, or myth from this country. Tell the whole thing in six pictures, start to finish. If a panel needs a word to make sense, write it inside the panel.

Spec: `{"panels":6,"caption":"Their story, six panels in order"}`

**`creature-they-warn-about`** · **NEW** · form `box-beside` · page `culture`
`tags: folklore-belief, story-telling`

> **Draw the thing children there are warned about**
> Every country has something people say is out there — in the forest, in the river, in the mountains, under the bed. Find one from this country. Draw it the way people there describe it, then write who it is supposed to come for and what you are meant to do if you meet it.

Spec: `{"caption":"The way people there describe it","lines":3}`

**`luck-there`** · **NEW** · form `split-two` · page `culture`
`tags: folklore-belief, daily-life` · `mode: us-contrast`

> **Find out what brings luck and what breaks it**
> Find four things people there believe bring good luck or bad — a number, a color, a bird, a day, a word you do not say out loud, something you must not do with your left hand. Write each one on the left and what it is supposed to do on the right.

Spec: `{"columns":["The thing","What it is supposed to do"],"rows":4}`

**`what-the-old-people-say`** · **NEW** · form `bullets` · page `culture`
`tags: folklore-belief, health, family` · `mode: personal-voice`

> **Five things they say that are not in any book**
> Find five things older people there tell younger ones as if they were plainly true — about weather, about food, about what makes you sick, about what you must not do after dark. Write them one to a bullet, and put a star next to any that turns out to be right.

Spec: `{"items":5,"marker":"bullet","caption":"Five things people there say"}`

**`how-they-remember-the-dead`** · **NEW** · form `box-note` · page `culture`
`tags: folklore-belief, religion, family`

> **Find out what they do when somebody dies**
> Find out what happens there when a person dies — where they are buried or burned, what the family wears, how long they stay home, and whether there is a day in the year when everybody goes to visit the dead. Draw the grave, the shrine, or the place people go, and write one thing they do that we do not.

Spec: `{"caption":"Where people go to remember","lines":2}`

**`holiday-they-mark`** · **KEEP** · form `fields` · page `culture`
`tags: holiday-calendar, story-telling`

> **Find their biggest holiday**
> Find the one day of the year this whole country celebrates. Find what it remembers and one thing people do on it.

Spec: `{"captions":["The day","What it remembers","What people do"],"lines_each":1}`

**`holidays-through-the-year`** · **NEW** · form `list-n` · page `culture`
`tags: holiday-calendar, religion, agriculture`

> **Their year, in six days**
> Find six days this country stops for. List them in the order they come through the year, starting in January, and write next to each whether it is a religious day, a country day, or a harvest day.

Spec: `{"items":6,"marker":"number","caption":"In the order they come through the year"}`

**`same-day-different-name`** · **NEW** · form `venn` · page `culture`
`tags: holiday-calendar, religion` · `mode: us-contrast`

> **The days we both keep**
> Find out which days this country marks that we do not, which days we mark that they do not, and which days both of us keep. Write them in the three parts of the circles — and for anything in the middle, write next to it what they call it.

Spec: `{"labels":["Days they keep","Days we keep"],"shared":"Both","lines_each":3}`

**`what-year-is-it-there`** · **NEW** · form `figure-anchor` · page `culture`
`tags: holiday-calendar, religion, sun-and-seasons` · `mode: measurement`

> **Find out what year it is there**
> Some countries do not count years from the birth of Christ, and some run two calendars at once — one for the office, one for the holidays. Find the year it is right now on the calendar used for feast days there. Write it in the box, then what their count starts from and when their new year falls. If they use our calendar, find the last one they used and the year they changed.

Spec: `{"caption":"The year it is there right now","unit":"","anchor_prompt":"Their years count from… and their new year falls…"}`

#### Making, wearing, and what they are proud of

**`craft-of-the-land`** · **KEEP** · form `specimen-boxes` · page `culture`
`tags: crafts, music-and-art`

> **Find their craft or art**
> Find one traditional art or craft from this country: weaving, pottery, painting, carving. Find a picture of the pattern and draw it four times, the way it would repeat across a real rug, pot or cloth. Label the colors.

Spec: `{"boxes":4,"caption":"The same pattern, four times","label_lines":1,"circle_one":false}`

**`how-they-make-it`** · **NEW** · form `storyboard` · page `culture`
`tags: crafts, trade, work-and-money` · `mode: hands-on`

> **Watch something get made**
> Find out how one thing this country is known for is actually made — a cloth, a pot, a knife, a cheese, a paper, an instrument. Tell it in six pictures from raw material to finished thing. If a panel needs a word to make sense, write it inside the panel.

Spec: `{"panels":6}`

**`what-they-wear`** · **KEEP** · form `label-small` · page `culture`
`tags: clothing, crafts, holiday-calendar`

> **Draw what they wear**
> Find what people there wear for a wedding, a holiday or a festival. Draw one outfit and label three parts: the one that says where it's from, the one made by hand, and the one you'd wear yourself.

Spec: `{"caption":"Draw the outfit, then label three parts","callouts":3}`

**`sound-of-the-country`** · **KEEP** · form `fields` · page `culture`
`tags: music-and-art, crafts` · `mode: hands-on`

> **Listen to their music**
> Find one traditional instrument or style of music from this country and listen to a minute of it. Find out what the instrument is made of, and write one word for how it sounds.

Spec: `{"captions":["Instrument or style","What it is made of","One word for how it sounds"],"lines_each":1}`

**`the-sport-they-love`** · **KEEP** · form `differences` · page `culture`
`tags: play-and-sport, daily-life` · `mode: us-contrast`

> **Find their favorite sport**
> Find the most popular sport in this country. Write three of its rules next to the rules of a game you play. Then write the one rule both games share.

Spec: `{"columns":["Their game","A game I play"],"rows":3,"shared":1}`

**`before-you-visit`** · **KEEP** · form `bullets` · page `culture`
`tags: daily-life, family` · `mode: us-contrast`

> **Four things to know before you knock**
> Find out what counts as polite there and what would embarrass a visitor: shoes, greetings, hands, gifts, how loud to be, what you call somebody older than you. Write four things you would want to know before the door opened, one to a bullet.

Spec: `{"items":4,"marker":"bullet","caption":"Four things a visitor should know"}`

**`landmark-to-see`** · **UPDATE** · form `box-beside` · page `landmarks`
`tags: crafts, travel, city-life`

> **Pick a landmark to visit**
> Find one famous place in this country you'd want to visit. Draw it and write one sentence about what makes it special.

Spec: `{"caption":"Sketch it","lines":2}`

#### Food

**`tonights-dinner`** · **KEEP** · form `box-beside` · page `food`
`tags: everyday-food, daily-life`

> **Plan tonight's dinner there**
> Find a dish people eat there on an ordinary weeknight, not a feast day. Draw the plate the way it would come to the table, write what's on it, and write the one thing you would have to go looking for to make it at your house.

Spec: `{"caption":"Sketch it","lines":3}`

**`breakfast-there`** · **KEEP** · form `venn` · page `food`
`tags: everyday-food, daily-life` · `mode: us-contrast`

> **Eat their breakfast**
> Find out what people eat for breakfast in this country. Write what is on their plate on their side, what is on yours on yours, and anything that turns up on both in the middle.

Spec: `{"labels":["Their breakfast","Our breakfast"],"shared":"Both","lines_each":3}`

**`school-lunch`** · **UPDATE** · form `differences` · page `food`
`tags: everyday-food, schooling, public-services` · `mode: us-contrast`

> **What kids eat in the middle of the day**
> Find out what a kid your age there eats in the middle of the day, who cooks it, and whether the family pays for it. Write each one next to how lunch works at our house. Then write the one thing about lunch you would not have to explain to a kid from there.

Spec: `{"columns":["Their lunch","Our lunch"],"rows":3,"shared":1}`

**`animals-on-the-menu`** · **KEEP** · form `venn` · page `food`
`tags: everyday-food, animals-with-people, agriculture` · `mode: us-contrast`

> **Find the animals they eat**
> Find out which animals people raise or catch for food in this country. Write the ones only they eat on their side, the ones only you eat on yours, and the ones both of you eat in the middle. Different isn't gross, just different.

Spec: `{"labels":["They eat","We eat"],"shared":"Both","lines_each":3}`

**`famous-dish`** · **KEEP** · form `fields` · page `food`
`tags: celebration-food, story-telling`

> **The dish they're known for**
> Find the one dish a person from this country would name first if you asked what to eat there. Write what goes in it and one reason it became the famous one.

Spec: `{"captions":["What it is called","What goes in it","Why this one"],"lines_each":1}`

**`holiday-dish`** · **KEEP** · form `fields` · page `food`
`tags: celebration-food, holiday-calendar, religion`

> **The food that only comes once a year**
> Find the dish people there only make for one holiday. Write which day it belongs to and one reason it's saved for that day.

Spec: `{"captions":["The dish","The day it belongs to","Why it waits"],"lines_each":1}`

**`something-sweet`** · **KEEP** · form `box-beside` · page `food`
`tags: celebration-food, holiday-calendar, agriculture`

> **Find something sweet**
> Find a dessert, cake or sweet people there make for special days. Draw it, then write what makes it sweet — honey, dates, sugar cane, fruit — and what day of the year people there make it for.

Spec: `{"caption":"Sketch it","lines":3}`

**`street-food`** · **KEEP** · form `fields` · page `food`
`tags: everyday-food, public-money, city-life`

> **What they'd buy with their own money**
> Find one thing sold from a stall or a cart there that a kid could buy with their own coins. Find out where you would buy it and what it costs.

Spec: `{"captions":["What it is","Where you would buy it","What it costs"],"lines_each":1}`

**`drink-with-dinner`** · **KEEP** · form `lines-4` · page `food`
`tags: everyday-food, agriculture`

> **What's in their cup**
> Find out what people there drink with a meal: tea, coffee, juice, milk, something you've never heard of. Write how it's made and whether it's served hot or cold.

Spec: `{"lines":4}`

**`market-day`** · **KEEP** · form `specimen-boxes` · page `food`
`tags: everyday-food, city-life, trade`

> **Walk through their market**
> Find a photo of a market in this country. Draw four things being sold in it and label each one, then circle the one you have never seen for sale where you live.

Spec: `{"boxes":4,"caption":"Four things for sale","label_lines":1,"circle_one":true}`

**`market-days`** · **NEW** · form `week-strip` · page `food`
`tags: everyday-food, city-life, trade`

> **Find out when the market runs**
> Find out which days of the week the main market or market day happens in a town there. Shade those days, then write what the biggest one is for — food, animals, cloth, everything.

Spec: `{"labels":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"marker":"box","orient":"across","caption":"Shade the days the market is open"}`

**`grows-better-there`** · **NEW** · form `box-beside` · page `food`
`tags: agriculture, everyday-food, trade` · `mode: us-contrast`

> **Find something you love that grows better there**
> Pick a food you actually like to eat and find out whether it grows better in this country than it does here. Draw it growing — on the tree, in the ground, on the vine — then write what their land or weather gives it that ours doesn't, and where the ones in our kitchen come from.

Spec: `{"caption":"Draw it growing","lines":3}`

**`cook-it`** · **KEEP** · form `recipe-card` · page `food` · tier `fixed`
`tags: everyday-food, celebration-food, crafts` · `mode: hands-on`

> **Cook one thing from your country**
> Pick one dish from anything you found this month and find a real recipe for it. Copy it onto your recipe page in your own handwriting, then make it with a grown-up. Write down what you'd change next time.

Spec: `{"ingredients":10,"steps":6,"sketch":true}`

#### Voices

**`hear-from-a-kid`** · **KEEP** · form `lines-4` · page `people`
`tags: daily-life, schooling` · `mode: personal-voice`

> **Hear it from someone who lives there**
> Find a kid or a young person from this country describing their own life — a video, an interview, a letter, a school project posted online. Write down one thing they said that you would never have guessed from anything else you found this month.

Spec: `{"lines":4}`

**`what-they-say-about-us`** · **NEW** · form `lines-4` · page `people`
`tags: migration, travel` · `mode: personal-voice, us-contrast`

> **Hear what they say about us**
> Find somebody from this country talking or writing about visiting or moving to America — what surprised them, what they missed, what they thought was strange. Write what they said in your own words. If you cannot find anyone who came here, find somebody from there writing about any country that is not their own.

Spec: `{"lines":4}`

---

### Week 4 — the project sequence

Thirty rows, six project types, five steps each, all `KEEP`. Week 4 is composed rather
than packed: the project type's materials print as a checklist, its five steps as
check-off lines, and the one planning task carries a storyboard. Only the six `-choose`
rows are bound. Wording for all thirty is unchanged from v2.

| Key | Title | Status | Form |
|---|---|---|---|
| `zine-choose` | Plan your pages | KEEP | `storyboard` |
| `zine-gather` | Gather your drawings and pens | KEEP | — (composed) |
| `zine-draw-first` | Draw the cover and first pages | KEEP | — (composed) |
| `zine-draw-rest` | Finish the pages | KEEP | — (composed) |
| `zine-present` | Read your zine out loud | KEEP | — (composed) |
| `model-choose` | Decide what you will build | KEEP | `storyboard` `{"panels":2}` |
| `model-gather` | Gather your materials | KEEP | — (composed) |
| `model-build-base` | Build the base and big shapes | KEEP | — (composed) |
| `model-build-details` | Paint it and add the details | KEEP | — (composed) |
| `model-present` | Show your model and explain it | KEEP | — (composed) |
| `museum-choose` | Choose your six objects | KEEP | `storyboard` |
| `museum-gather` | Find your box and materials | KEEP | — (composed) |
| `museum-make-objects` | Make the first three objects | KEEP | — (composed) |
| `museum-finish-and-label` | Finish the rest and label them | KEEP | — (composed) |
| `museum-present` | Open your box for someone | KEEP | — (composed) |
| `skit-choose` | Pick the scene you will act | KEEP | `storyboard` |
| `skit-gather` | Gather props and costumes | KEEP | — (composed) |
| `skit-script` | Write the lines out | KEEP | — (composed) |
| `skit-rehearse-run` | Run it twice, out loud | KEEP | — (composed) |
| `skit-present` | Perform your skit | KEEP | — (composed) |
| `trifold-choose` | Plan your three panels | KEEP | `storyboard` `{"panels":3}` |
| `trifold-gather` | Gather your materials | KEEP | — (composed) |
| `trifold-build-left-and-center` | Build the left and center panels | KEEP | — (composed) |
| `trifold-build-right-and-finishing` | Finish the right panel | KEEP | — (composed) |
| `trifold-present` | Rehearse and present your board | KEEP | — (composed) |
| `video-choose` | Plan your shots | KEEP | `storyboard` |
| `video-gather` | Gather what you will film | KEEP | — (composed) |
| `video-shoot` | Film your shot list | KEEP | — (composed) |
| `video-edit` | Cut it together | KEEP | — (composed) |
| `video-present` | Show your video | KEEP | — (composed) |

---

## 3. Bindings, tags, focuses, and the numbers

### How many prompts want each form

| Form | Thirds | Wk 1 | Wk 2 | Wk 3 | Total |
|---|---|---|---|---|---|
| `box-beside` | 1 | 2 | 2 | 9 | **13** |
| `fields` | 1 | · | 6 | 6 | **12** |
| `table-3` | 2 | · | 9 | 2 | **11** |
| `bullets` | 1 | · | 5 | 5 | **10** |
| `box-note` | 2 | 1 | 7 | 2 | **10** |
| `differences` | 1 | · | 5 | 4 | **9** |
| `lines-4` | 1 | 1 | 3 | 4 | **8** |
| `figure-anchor` | 1 | 3 | 1 | 3 | **7** |
| `flow-steps` | 1 | · | 6 | 1 | **7** |
| `timeline` | 1 | · | 6 | 1 | **7** |
| `specimen-boxes` | 2 | · | 3 | 4 | **7** |
| `split-two` | 1 | 2 | 2 | 3 | **7** |
| `then-now` | 2 | · | 6 | 1 | **7** |
| `bar-graph` | 2 | · | 5 | 1 | **6** |
| `pictograph` | 1 | · | 4 | 2 | **6** |
| `list-n` | 1 | 1 | 1 | 3 | **5** |
| `map-marks` | 2 | 1 | 4 | · | **5** |
| `label-small` | 2 | · | 1 | 4 | **5** |
| `lines-8` | 2 | · | 2 | 2 | **4** |
| `clock-pair` | 1 | 1 | 1 | 2 | **4** |
| `scale-strip` | 1 | · | 4 | · | **4** |
| `venn` | 2 | · | · | 3 | **3** |
| `storyboard` | 2 | · | · | 3 | **3** |
| `hundred-people` | 2 | · | 2 | 1 | **3** |
| `week-strip` | 1 | · | · | 2 | **2** |
| `recipe-card` | 3 | · | · | 1 | **1** |
| `label-it` | 3 | · | 1 | · | **1** |
| `checklist` | 1 | · | · | · | **0** |

**167 bindings across weeks 1–3** — 12 in week 1, 86 in week 2, 69 in week 3, of which
153 are drawable and two are pinned — plus `checklist` and `storyboard` doing week 4's
composed sheet. Twenty-seven forms carry prompts; `checklist` is week 4's and no form is
orphaned.

`fields` holds at twelve and is now 7.2% of the library, down from 14.3% at v2. That
number was bought entirely by writing new prompts onto forms that make an answer visible.

**`box-beside` is the new form to watch, and thirteen is its cap.** Nine of the thirteen
sit in week 3, which is 12.9% of that pool — still the healthiest top-form share the
library has ever had, but it is the number that will move first. The next week-3 prompt
that wants a small sketch and three lines goes somewhere else.

`table-3` at eleven is the deliberate result of the `fields` cap: three-part answers with
repeating rows now have a real home, and nine of them are in week 2.

### What one printed week costs in paper

| Week | What prints | Thirds | Sheets |
|---|---|---|---|
| 1 | 4 core + 1 drawn from 8 | 6.2 | 2.1 |
| 2 | `wow-fact` + 4 dealt | 7.3 | 2.4 |
| 3 | `cook-it` + 4 dealt | 8.3 | 2.8 — the recipe takes a sheet of its own |
| 4 | composed | 3.0 | 1.0 |
| | | **24.8** | **8.3 a month** |

Measured over the draw rather than averaged over the pool. Twenty-five sheets a month
across three learners, about 224 over a nine-month year.

**The deal balances the paper, which is the reason the spread is now narrow.** Per-week
thirds run at sd 0.97 against sd 1.52 under the old two-draws-of-five, and a week spills
onto a fourth sheet 3% of the time rather than 28%.

### The tag system

`prompt_tags` replaces the single `page` column. Every week 1–3 prompt carries two to four
**topic** tags and zero to two **mode** tags. `page` is kept on the row for the migration
and is not read by the draw.

**Why two namespaces.** The v3 batches wrote one flat vocabulary, and inside it
`us-contrast` reached 41 of 167 prompts — a quarter of the library on one tag.
`demographics-stat` reached 17, `measurement` 14. Those five or six tags do not describe
what a prompt is *about*; they describe how the kid produces the answer. Weighting one of
them at 3 from a focus pulls a quarter of the pool at once and rebuilds the triple-duty
overlap the tag mechanism was designed to remove. Splitting them out costs a prefix now
and a re-tag of 167 rows later.

**Fifty topic tags.** Every one has at least two members. Largest: `daily-life` 24,
`who-gets-less` 22, `city-life` 18, `crafts` 17, `religion` 17, `landform` 16,
`governance` 15, `agriculture` 15. Smallest at two: `future-plans`, `altitude`,
`clothing`. `emblems` (4) sits entirely in week 1 and is never drawn against, which is
correct — week 1 is a uniform draw from eight, not a weighted one.

**Seven mode tags**, and they do two jobs the topic tags cannot.

| Mode tag | Members | What it is for |
|---|---|---|
| `us-contrast` | 41 | The answer is only meaningful next to our own number |
| `demographics-stat` | 17 | A share of a population |
| `measurement` | 14 | Units, conversion, a scale |
| `hands-on` | 10 | The kid does a physical thing, not only reads |
| `map-work` | 8 | The answer goes onto a map |
| `personal-voice` | 8 | Somebody from there is speaking |
| `scripture-read` | 7 | A passage is read as part of the task |

**Job one — balance.** *Every month draws at least one `hands-on` and at least one
`personal-voice` prompt across weeks 2 and 3 combined.* At month level this is easy: week
3 holds seven `hands-on` and six `personal-voice`. At week level it is not — week 2 holds
one and two — so the rule is scoped to the month or it forces a repeat. A month with
nobody from the country speaking in it is the failure this library is actually trying to
avoid, and this is the only mechanism that guarantees against it.

**Job two — anti-monotony.** *Never draw two prompts sharing a mode tag into one month's
weeks 2–3.* Nineteen of week 2's prompts and eighteen of week 3's are `us-contrast`;
without this rule a week can print three sheets that all say *and now write ours next to
it*. The form counts will report no repeat. Scoped to the month rather than the week
because the deal, not the draw, decides which week a prompt lands in — a week-scoped rule
would have to be a fifth key on the deal instead of a constraint on the draw, and at seven
mode tags against 153 prompts the month scope costs nothing it buys.

### The focus table

`focus_tags` replaces the hand-typed weight-3 lists. A focus declares which tags it cares
about, not which prompts, so a new prompt self-onboards: tag it once at authoring time and
every focus with a matching affinity starts drawing it correctly.

```
draw_weight(prompt, focus, learner) = (1 + 2 × Σ focus_tags.weight for shared topic tags)
                                      × recency_multiplier
```

The `1 +` floor keeps the no-zeros rule: a prompt with no overlap is still reachable at
baseline.

**The `2 ×` is the scale, and it is load-bearing.** Additive weights of 1–3 against a
153-prompt pool are a weak lever: at `1 +` a focus lifts on-theme content by about 2×
over drawing with no focus at all, which sounds like a lot and lands as 1.5 of 10 tasks
for a thin focus. Doubling the scale puts a typical focus at 2.5–4 of 10 without letting
the heaviest single prompt run away — its share of pool weight stays under 5%. Tripling
buys another 0.2 and starts to make the same prompts arrive every month; 2 is where it
sits.

| Focus | Tag weights |
|---|---|
| **Ancient World** | `deep-time 3 · empire-and-rule 3 · crafts 3 · folklore-belief 2 · christian-history 2 · story-telling 2 · extinction 1` |
| **Wild Places** | `wildlife 3 · extinction 3 · landform 3 · damage-and-repair 2 · water 2 · animals-with-people 2 · play-and-sport 2 · agriculture 1` |
| **People and Power** | `governance 3 · advocacy 2 · public-services 2 · public-money 2 · schooling 2 · who-gets-less 2 · conflict-history 1` |
| **Food and Craft** | `everyday-food 3 · celebration-food 3 · agriculture 3 · crafts 2 · trade 2 · animals-with-people 1` |
| **Conflict and Change** | `conflict-history 3 · empire-and-rule 3 · forced-movement 3 · migration 2 · milestone 2 · who-gets-less 2 · damage-and-repair 1` |
| **Land and Sky** | `landform 3 · weather-pattern 3 · sun-and-seasons 3 · altitude 2 · water 2 · agriculture 2 · travel 1` |
| **Who Lives Here** | `family 3 · daily-life 3 · schooling 2 · housing 2 · names 2 · health 2 · city-life 2 · migration 1` |
| **Who Gets What** | `who-gets-less 3 · who-owns-it 3 · forced-movement 3 · advocacy 2 · empire-and-rule 2 · public-money 2 · work-and-money 2 · health 1` |
| **Stories and Spirits** | `folklore-belief 3 · story-telling 3 · names 3 · religion 2 · music-and-art 2 · christian-history 2 · language 1` |

### What each focus actually reaches

Two counts, and only the second one means anything. *Above baseline* is every prompt the
focus gives any lift at all, including a single weight-1 tag. *On-theme* is the hand audit
in `../other/FOCUS-AUDIT.md`: every prompt read against every focus and judged on whether
a learner who picked that focus would recognise the task as an instance of what they
picked.

| Focus | Above baseline | **On-theme** | of those, natural wk 2 / wk 3 | Heaviest prompt |
|---|---|---|---|---|
| **Ancient World** | 43 | **12** | 11 / 1 | ×9 |
| **Wild Places** | 41 | **17** | 14 / 3 | ×9 |
| **People and Power** | 52 | **23** | 20 / 3 | ×9 |
| **Food and Craft** | 44 | **28** | 9 / 19 | ×9 |
| **Conflict and Change** | 52 | **10** | 9 / 1 | ×10 |
| **Land and Sky** | 42 | **19** | 16 / 3 | ×11 |
| **Who Lives Here** | 66 | **40** | 13 / 27 | ×9 |
| **Who Gets What** | 54 | **28** | 25 / 3 | ×9 |
| **Stories and Spirits** | 41 | **36** | 9 / 27 | ×7 |

**The tagging is accurate; the counts are what is thin.** Graded against the audit the tag
tables score ~100% recall — three prompts in the whole library are on-theme by hand and
carry no matching tag at all (`made-because-they-needed-it`, `where-you-buy-clothes`,
`when-it-reached-everybody`) — and no prompt weighted ×7 or above is off-theme. A new
prompt does self-onboard correctly. What the audit found is a **content** gap: five
focuses have three or fewer on-theme prompts on one side of the old week line, and Ancient
World and Conflict and Change have one each. That gap is what the merged pool in *The
draw* exists to survive and what the six-prompts-each writing job exists to close.

**`civic-process` is a strict subset of `governance`** — all four of its prompts carry
both — so People and Power weighting both at 3 pays twice for the same four rows. The tag
stays as documentation of what those four prompts are and People and Power does not weight
it, which is why the focus table below lists seven tags for it and not eight. The two
tables under *What each focus actually reaches* and *What the shape delivers* were measured
with it weighted: People and Power's reach is unchanged, since `governance` covers the same
four prompts, but those four fall from ×13 to ×7 and its measured columns move a little.
Slice 20 re-measures against the finished library.

**Seven topic tags carry no weight from any focus** — `clothing`, `emblems`,
`future-plans`, `holiday-calendar` (10 members), `infrastructure` (10), `sabbath`,
`science-research`. Twenty-odd prompts no focus can ever pull above baseline.
`civic-process` is an eighth unweighted tag and does not join them: its four prompts all
carry `governance`, so People and Power still reaches every one of them.

**Two focuses are new.** Both come out of the tag work rather than the other way round.

**Who Gets What** — *who has less of it, who took it, and who is being paid.* Twenty-eight
on-theme prompts. None of the seven v2 focuses reached this material, because until the
tag pass there was no name for it.

**Stories and Spirits** — *what they tell each other, what they are called, and what they
think is out there.* Thirty-six on-theme prompts, the deepest focus in the library. It is
also the one an eleven-year-old picks off the list unprompted, which is worth something on
its own.

**Both need `country_focus_affinity` rows before they ship.** A focus with none is never
recommended for any country on any country card, forever. Roughly twenty countries each
with a one-line reason. For Who Gets What this matters more than for any other focus,
because the countries it suits are not the ones a kid picks off a map.

### The draw

Weeks 2 and 3 are **one pool**. `week_theme` stays on the row as the prompt's natural
half and is read only by the deal; nothing in the draw sees it.

```
pool     = every week 2–3 prompt, tier != 'fixed', archived = 0     -> 153
pinned   = wow-fact (week 2), cook-it (week 3)                      ->   2
drawn    = 6 weighted + 2 wildcard                                  ->   8
                                                                    ---  10 tasks
```

**Ten tasks across the two weeks, and the month is twenty again.** Five in week 1, ten
here, five in week 4, on twenty weekdays. `cook-it` appended on top of a full week made
twenty-one, which is the one number `DESIGN.md` §4 says a kid cannot hold.

**Six weighted.** Sequential weighted selection without replacement on `draw_weight`.

**Two wildcards.** Each computes affinity across the recency-eligible remainder, takes the
bottom quarter, and draws uniformly from it. The bottom quarter of 153 is thirty-eight, so
the wildcard is genuinely a wildcard rather than the same handful of orphans every month.
Two rather than one because the slot is a fifth of the draw and the draw is now eight.

**No form appears more than twice in the ten, and never twice in one week.** The cap is
enforced in the draw — a form already holding two seats has its weight zeroed, counting
the two pins — and the within-week half falls out of the deal. Measured at zero collisions
in 22,500 simulated months. Without the rule a form repeats inside a week in about 40% of
weeks, which is not a library problem: five draws against twenty-seven forms floors at
32.5% even if every form were the same size.

**Never two prompts sharing a mode tag in the same week.** The hard rule, not the soft
one — with seven mode tags against a 153-prompt pool it cannot deadlock, measured at zero
fallbacks in 40,000 draws.

**Recency.**

```
recency_multiplier = 0  if drawn for this learner in the last 5 months, else 1
```

Scoped per learner, so a prompt stays available to a sibling while it rests for one child.
Five months of eight blocks forty of 153. If a cooldown would ever empty the eligible pool
— impossible at these numbers — drop the single stalest cooldown prompt back in rather
than erroring.

### The deal

The eight drawn are split four and four into the two weeks; each pin joins its own.
Seventy candidate splits, scored exhaustively, first key wins:

1. **No form twice inside one week.**
2. **Focus balance** — the two weeks hold as near the same **sum of `draw_weight`** as
   the split allows. This is the rule that does the work: it is what stops a focus's whole
   month landing in one week. It must be the summed weight and not a count of prompts
   above baseline — a count treats a prompt carrying one weight-1 tag as worth the same as
   a ×9, and measured against the audit it gives back a third of what the merge bought
   (Ancient World lands at 57% rather than 42%).
3. **The arc** — prefer natural-week-2 prompts in week 2 and natural-week-3 prompts in
   week 3. What the old hard split bought, kept as a lean rather than a wall.
4. **Paper** — the two weeks land as near the same number of thirds as possible.

### The pinned slots

Two prompts are tier `fixed`: they never enter weighted selection, never get a recency
score, and are never swappable.

**`cook-it`, week 3.** It breaks the ten-minute rule on purpose. At a normal weight it
would land three or four months out of nine, which would make the best part of the month
optional. It is pinned to the *later* week because it says *pick one dish from anything
you found this month*.

**`wow-fact`, week 2.** Pinned for the opposite reason: it is the one prompt in the
library with no subject at all — dig until something makes you say wow — so it is
on-theme for no focus and every focus, and a weighted draw is the wrong instrument for
it. Week 2 because the month should ask for it early, while there is still month left to
be surprised by.

Two other prompts assume they arrive late and must not be dealt into week 2:
`nations-before-the-throne` (*the one thing you learned this month*) and `hear-from-a-kid`
(*anything else you found this month*). They are ordinary drawn prompts; the constraint is
on the deal, not the draw.

### What the shape delivers

Measured at `2 ×`, over 2,500 simulated months per focus, against a hand audit of which
focus each of the 155 prompts actually serves — `../other/FOCUS-AUDIT.md`.

| Focus | On-theme of the ten: now → new | A week with none of it: now → new |
|---|---|---|
| Ancient World | 1.8 → 1.9 | 86% → **42%** |
| Wild Places | 2.3 → 2.6 | 58% → **20%** |
| People and Power | 2.4 → 2.7 | 64% → **20%** |
| Food and Craft | 4.4 → 4.1 | 23% → **1%** |
| Conflict and Change | 1.2 → 1.4 | 90% → **57%** |
| Land and Sky | 2.5 → 2.6 | 59% → **18%** |
| Who Lives Here | 3.8 → 3.3 | 20% → **11%** |
| Who Gets What | 2.9 → 3.0 | 48% → **13%** |
| Stories and Spirits | 3.9 → 3.9 | 22% → **6%** |

The second column is what the engine can actually deliver: the deal is scored on summed
draw weight, which is all it knows. A deal scored on the audit itself — an oracle the
built thing does not have — would take Ancient World to 37% and Who Lives Here to 5%, so
the gap between the two is the price of the proxy and it is small.

**The total barely moves and that is expected.** Merging dilutes the concentration a focus
enjoyed in its strong week and the month gives up a task; the two cancel. What the merge
buys is the second column — the failure this library actually had was a whole week of five
sheets that ignored the focus the learner chose, and it ran at 20–90% a month.

**Ancient World and Conflict and Change are still bad, and it is a content gap, not a draw
gap.** They have twelve and ten on-theme prompts in a 153 pool; no weighting reaches what
is not written. Six week-3-flavoured prompts each — an ordinary thing still done the old
way, a dish a conqueror left behind, a word a war put in the language, a street that
moved — brings them in line with the rest. That is the one piece of writing this version
still owes.

---

---

## 4. Rules this version adds

Six rules, all of them written because something in the v3 batches broke them.

**1. `label-it` has one binding. `fields` has twelve. `box-beside` has thirteen.**
Three caps, all load-bearing, all enforced against the whole library rather than against
one batch.

**2. A form that carries a slot must have a prompt that asks for it — including
`shared`.** Three `differences` bindings printed a *But the same:* rule under a prompt
that never asked for it. All three now ask.

**3. No two bindings on one form share a closing sentence.** The measurable thing is form
monotony; the felt thing is sentence monotony, and they are not the same. Seven of nine
`differences` prompts ended in the identical fourteen words, and five of seven
`flow-steps` opened with the identical eleven. All sixteen are distinct here. This costs
nothing at authoring time and is invisible in every metric the draw system reports, which
is exactly why it has to be a written rule.

**4. Every prompt carries a fallback clause.** The v3 batches claimed this and delivered
it on seven of sixty-three. A prompt that dead-ends for Bhutan is a prompt swapped by
hand, which is the thing the draw system exists to stop. In most of the twenty-odd
fallbacks added here the fallback is the more interesting half — *if nobody there is
allowed to ask their government for anything in public, find somebody outside the country
asking on their behalf.*

**5. No spec value hard-codes a year.** `ends: ["1925","Today"]` is stale in a year and
wrong in five. `A hundred years ago` is neither. Same for slugs: `what-they-want-by-2030`
is now `what-they-plan-next`.

**6. Every pin on `map-marks` is inside the country or on its edge.** The map is framed as
this country. A pin for *the country most of them visit* has nowhere to go.

---

## 5. What was dropped, and what changed name

### Dropped — six

| Key | Was | Why |
|---|---|---|
| `lowest-place` | `scale-strip` | Third altitude strip. Folded into `highest-point` at three marks, which is a better prompt: the whole vertical range of a country on one axis. |
| `three-cities` | `table-3` | City, population, known-for is already covered between `map-outline`, `landmark-to-see` and `city-and-country`. |
| `what-grows-where` | `venn` | Week 3 was carrying four Venns and three of them food. Overlapped `grows-better-there` and `what-they-grow`. |
| `school-week-there` | `week-strip` | Third shade-the-week prompt, and it answered `their-rest-day`'s question. Its good half — *which day do they call the first day of the week* — is folded into `their-rest-day`. |
| `box-caption` | form | Retired at v2. `box-note` holds its prompts. |
| `compare`, `figures` | forms | Retired at v2. `venn` and `figure-anchor` hold the slots. |

### Renamed or rewritten — five

| Was | Is now | What changed |
|---|---|---|
| `what-they-want-by-2030` | `what-they-plan-next` | Slug carried a year the prompt did not. Gained a fallback and a star-the-one-that-won't-happen line. |
| `when-they-were-protected` | `is-the-law-kept` | Was `differences` with two numeric columns, and was a near-duplicate of `when-it-reached-everybody`. Now `table-3` and asks the harder question: what the law says, what actually happens, how you know. |
| `what-they-invented-lately` | `made-because-they-needed-it` | Was `made-there-first` with a date filter. Now asks for an invention that answers a local problem, which is a different question and a better one. |
| `climate-bands` | `climate-bands` | Rebound `label-it` → `map-marks` at four pins. It was a second full sheet doing the same physical act as `landforms`. |
| `where-they-go-when-they-go` | `where-they-go-when-they-go` | Rebound `map-marks` → `table-3`. Pin 1 was a foreign country. |

### Fixed in place — nine

`family-size`, `school-lunch`, `girls-and-women`, `who-can-vote`, `the-sport-they-love`,
`if-you-get-sick`, `who-comes-when-it-burns`, `when-you-are-old-enough`, `law-you-notice`
— nine distinct `differences` closers where there were three. `family-size` and
`school-lunch` also gained the shared-row ask they were printing without.

`highest-point` absorbs `lowest-place` at three marks. `their-rest-day` absorbs the
first-day-of-the-week question. `what-people-believe` drops its *roughly how many* column
— `who-worships-what` owns the shares now — and takes *when it arrived there* instead,
and drops from four rows to three so a single-faith country does not print an empty one.
`landmark-to-see` drops from four ruled lines to two, matching `flag-draw`, which asks for
the same one sentence. `kingdom-over-this-place` and `feast-they-keep` now ask for five or
six lines against their eight ruled ones instead of one.

`how-far-away-is-it` gets a real anchor: *that is about n times our longest drive*, rather
than an unrelated flight time in the slot the form reserves for a comparison the kid
already understands. `in-their-numbers` is rewritten entirely — it used to produce the
identical metric-conversion table for nine consecutive countries; it now asks for the
units a country kept that nobody else uses.

`who-owns-the-roof` asked for three numbers on a two-row pictograph. Its rows are now
*own it there* and *own it here*.

---

## 6. What this implies for the build

Unchanged from v2. **No new renderer, form or knob.** All 83 prompts added since v2 land
on forms v2 already declares, so the build sequence is the one already planned.

**Ten new renderers**, each a branch in `worksheet.js` and a block in `print.css`, each
height measured against real paper before it is trusted: `fields`, `boxes`, `venn`,
`flow`, `pair`, `chart`, `grid`, `map`, `clocks`, `recipe`. Five forms cost nothing extra
because they ride existing renderers: `differences` on `split`; `list-n`, `week-strip` and
`bullets` on `checklist`; `figure-anchor` on `figures`.

**Knobs on renderers that already exist, and there are more of them than the four the v2
plan counted.** MARKER accepts `bullet` in the `checklist` branch, plus one CSS rule.
BELOW on the `box` branch stacks the two children `.beside` already builds. MIDDLE on the
new `pair` branch draws a captioned write-in line on the arrow, skipped when the string is
empty — four bindings use it. LINES on the new `clocks` branch is the rule `lines` already
uses. Four more are needed by v3 bindings and are not in the shipped `KINDS` table:
SHARED on `split`, which every `differences` binding sets; UNIT and ENDS on `timeline`,
which rule 5 depends on; and CIRCLE_ONE, ORIENT and CAPTION on `checklist`, which `list-n`
and `week-strip` need. The `figures` branch is not extended at all but rewritten:
`figure-anchor` is one boxed number with a unit and an anchor line, and the three-box
knobs go with the form that is retired.

**One schema fact decides sequencing, and it is not the CHECK constraints.**
`worksheet_layouts.kind` and `task_templates.tier` are CHECKs inside migrations that have
already applied and SQLite cannot alter a CHECK — but **Erase everything** on `/admin`
drops every table and the migration ledger with them, so both files are edited in place
and the database rebuilt (`DESIGN.md` §3). The ordering that remains is the real one: a
form row must exist before a prompt can bind to it.

**Two new tables**, `prompt_tags (task_template_id, namespace, tag)` and
`focus_tags (focus_id, tag, weight)`. The `namespace` column is the `topic` / `mode` split.
`learner_prompt_log` is not one of them: `plan_tasks` joined to `month_plans` already
answers when a learner last drew a prompt, and a log written at draw time would record
prompts a redraw threw away and cool them down for nothing.

**The draw engine is the largest code change in v3, and slice 11 built it.**
`src/lib/draw.js` is one draw of eight over the merged pool plus a deal — see §3 *The
draw* and *The deal*. Four things it gained: the tag join in place of the weight lookup,
the per-form cap of two, an exhaustive seventy-way deal, and the two pins. The deal is
small and pure — it takes ten prompts and returns two lists — and it takes no randomness,
so the same eight always land the same way. `plan_tasks.week_no` still holds 2 or 3 and
every screen downstream is unchanged: what changed is which rows get which number.

**Swap widened with the pool.** A swap in week 2 or 3 redraws from the whole merged pool
rather than from that week's half, respects the per-form cap against the nine tasks still
on the plan, and will not put a second copy of a form into the week it is swapping inside.
Both pins are unswappable, `cook-it` as before and `wow-fact` for the same reason.

**Seeds only insert, and that is why corrections go through Erase everything.** Every
seed statement is `ON CONFLICT DO NOTHING` and every binding is guarded on
`worksheet_layout_id IS NULL`, so new forms, prompts and tags land on a press and nothing
already there is touched. The §5 rewrites, the three `shared`-row fixes and the forty-six
rebindings are corrections to rows a press has already written, so they are made in
`002_seed.sql` and `005_worksheet_layouts.sql` in place and the database rebuilt —
**Erase everything · Apply pending · Run seed**. A migration would also work and is the
wrong shape: it would freeze a correction the library editor can no longer revise, and
there is no data in this database worth protecting from a rebuild.

**Build order, if it is split.** `specimen-boxes`, `venn`, `bar-graph` and `map-marks`
first: those four alone move the most prompts off a shape that fights them. `then-now`,
`flow-steps`, `scale-strip`, `pictograph`, `clock-pair` and `week-strip` second.
`recipe-card` and the two pinned slots last, because those change what a month is and not
just what a page looks like.

---

## 7. Still open

1. **`country_focus_affinity` rows for Who Lives Here, Who Gets What and Stories and
   Spirits.** Twenty countries each, one line of reason apiece. Without them the app never
   recommends any of the three. D-15, and it is the whole of slice 22.
2. **Twelve week-3-flavoured prompts, six each for Ancient World and Conflict and
   Change.** The one piece of writing v3 still owes. Everything else in this document is a
   draw change or a seed.

Three questions this section used to carry are settled. Sourcing on the six hardest
prompts — `the-group-that-gets-less`, `who-can-read`, `what-their-money-goes-to`,
`is-the-law-kept`, `can-they-worship-freely`, `the-company-that-got-caught` — stays on the
sourcing footer every worksheet already carries; there is no stretch-line mechanism and
none is built. `storyboard` gains CAPTION (§1), so `story-they-tell` and the two storyboards
still to come each name what their six panels are of. `emblems` stays: four members, all
in week 1, never drawn against — honest documentation of what `flag-draw`,
`currency-animal`, `national-symbol` and `anthem-listen` share, kept even though no focus
can ever reach it.
