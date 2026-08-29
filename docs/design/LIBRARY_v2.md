# The library

Every printed form, every prompt, and which form each prompt lands on. This is the
whole library as it should stand: 28 forms on 18 renderers, 114 prompts across four
weeks, seven focuses.

Each entry is marked **NEW**, **UPDATE**, **KEEP** or **DROP** against what is in the
database today.

**Status: spec, not built.** This is the source that slices 11 and up are cut from.
`DESIGN.md` §16 governs how a worksheet prints — thirds, packing, the route,
specs-as-data, the library editor's reach — and none of that changes here. This
governs only which forms exist, what each one holds, and which prompt lands on
which. Where the two disagree about how many forms there are, this document is the
one being built to.

**What this library is for.** A learner gets five tasks a week and about nine sheets of
paper a month. The prompt says what to find out. The form under it says what shape the
answer has — and a form that doesn't match its prompt costs twice: the kid writes
prose where a drawing belonged, and the sheet looks like the last one.

**Who it is written for.** Three learners, home educated, working the same country in
the same month. No prompt assumes a school building, a school bus, a school cafeteria
or a classroom of thirty. Where a prompt asks a kid to compare their own life, the
comparison is to their house, their week and their own day — because that is what they
actually have to compare with.

**The rule the rest of it follows.** Ruled lines are what a prompt gets when its answer
genuinely has no shape. Seven prompts print on them: three because nothing better fits,
two because a scripture passage wants room and nothing else, and two because the answer
is a paragraph in the kid's own voice and any scaffold under it would flatten what it
is for.

---

## 1. The forms

Twenty-eight forms, built on eighteen renderers. A form is a row in
`worksheet_layouts`; a renderer is a `kind` in `worksheet.js`. Several forms share
one renderer and differ only in their spec, which is why the list is long and the
code is not.

**Heights are the load-bearing number.** A sheet holds three thirds and a form never
splits across a page break, so a form that overflows its declared height pushes the
next one off the paper. Change a height before you change anything else about a form.

**A spec is data, never markup.** The renderer reads the keys it knows for that kind,
escapes every string, and drops the rest.

**A form carries a slot for every thing its prompt asks for, and asks for every slot
it carries.** This cuts both ways. A prompt that ends in *and write one sentence* over
a form with `lines: 0` sends the sentence to the margin. A form with four ruled lines
under a prompt that asks for one word prints three empty lines every month and teaches
the kid that most of the paper is decoration. A form with three captions under a prompt
that asks one question invents two of the three answers. Every binding in section 2
declares a spec that matches its prompt count for count.

---

### Ruled lines — kind `lines`

The generic. Two forms, seven prompts between them, and that is the ceiling: ruled
lines are what a prompt gets when its answer has no shape, not what it gets by default.

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `lines-4` | **KEEP** | 1 | `{"lines":4}` | LINES |
| `lines-8` | **KEEP** | 2 | `{"lines":8}` | LINES |

`lines-8` is the scripture form. Two prompts ask a kid to read a passage and write
what it means for the country in front of them; that wants room and nothing else.

`lines-4` carries the five prompts whose answer is prose on purpose — the wow fact,
the drink, a headline retold in the kid's own words, and one person from the country
speaking for themselves. These are the only prompts in the library where the writing
*is* the finding, and a caption over them would decide the answer before the kid got
there.

`lines-4` is also the fallback for any prompt with no binding, so it can never be
retired.

---

### Labelled short answers — kind `fields` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `fields` | **NEW** | 1 | `{"captions":["","",""],"lines_each":1}` | CAPTIONS, LINES_EACH |

Two to four stacked slots, each a small caption in the margin above one or two ruled
lines. Renders whatever length CAPTIONS is.

The most common prompt shape in the library is *find X, write what it is and two
things about it.* Twelve prompts want it. On ruled lines a kid writes a paragraph and
misses one of the three asks; with the captions printed, the form asks the questions
so the prompt doesn't have to.

**This form only works if every binding sets CAPTIONS.** Shipped with empty defaults it
becomes the new ruled-lines inside a month. Every binding in section 2 specifies them.
A `fields` prompt with no override is a bug, not a default.

**Twelve is the cap.** `fields` is the most reachable shape in the set and the easiest
to write a prompt for, which is exactly why it is the one that runs away with a week.
New prompts go on a form that makes the answer visible — a drawing, a bar, a bullet, a
map — or they go on ruled lines. They do not go here.

---

### One box — kind `box`

Four forms on one renderer. `lines` puts writing room beside the box, or under it
when BELOW is set; `callouts` puts numbered leader lines down its side; a form uses
one or the other or neither.

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `box-beside` | **KEEP** | 1 | `{"caption":"Sketch it","lines":4,"callouts":0}` | CAPTION, LINES, CALLOUTS |
| `box-note` | **NEW** | 2 | `{"caption":"Draw it here","lines":2,"below":true,"callouts":0}` | CAPTION, LINES, BELOW, CALLOUTS |
| `box-caption` | **DROP** | — | — | — |
| `label-small` | **NEW** | 2 | `{"caption":"Draw it, then label the parts","lines":0,"callouts":3}` | ” |
| `label-it` | **KEEP** | 3 | `{"caption":"Draw it big, then label the parts","lines":0,"callouts":6}` | ” |

`box-caption` is retired and `box-note` takes its prompts. `box-caption` was a
two-thirds drawing box at `lines: 0` — no writing room at all — and every prompt bound
to it ended in *and write one sentence*, *and write how old it is*, *and write one
fact*. The sentence had nowhere to go but the margin. No prompt in the library is a
drawing and nothing else, so the form had no legitimate occupant.

`box-note` is the same box with one or two ruled lines **under** it rather than beside
it. BELOW is a boolean on the existing `box` renderer and the whole of the code
change: at `lines > 0` the renderer already builds a `.beside` pair, and BELOW stacks
the same two children instead of setting them side by side. Beside is wrong here — a
55% side column against a two-thirds-tall box is a narrow canyon of white for one
sentence, and it steals half the drawing.

`label-small` fills the gap between a drawing box with nowhere to write labels and a
full-sheet sketch with six of them. Two prompts tell a kid to label a drawing and
need about three labels' worth of room.

`label-it` takes a whole sheet and has exactly one prompt: the land. That is correct.
The land is the one subject in the month worth a full page, and the prompt is written
to earn it.

---

### Several boxes, each labelled — kind `boxes` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `specimen-boxes` | **NEW** | 2 | `{"boxes":4,"caption":"","label_lines":1,"circle_one":false}` | BOXES (2–6), CAPTION, LABEL_LINES, CIRCLE_ONE |

A row or a 2×2 block of small drawing boxes, one ruled label line under each. When
CIRCLE_ONE is true, an instruction line at the foot: *circle the one that…*

*Find several things and draw each one* is a whole class of prompt with nowhere to
land today — a market with four things in it, four minerals, a repeating pattern, the
leaf and the fruit and the thing they carve from the wood. On a single box the kid
draws one of the four; on ruled lines they draw none. Four prompts want this, and it
is the form that gets drawings onto pages that were going to be prose.

---

### Two columns — kinds `split` and `table`

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `split-two` | **KEEP** | 1 | `{"columns":["Their word","How it sounds"],"rows":4}` | COLUMNS, ROWS |
| `differences` | **NEW** | 1 | `{"columns":["There","Here"],"rows":3,"shared":1}` | COLUMNS, ROWS, SHARED |
| `table-3` | **KEEP** | 2 | `{"columns":["What","Where","Why it matters"],"rows":4}` | COLUMNS, ROWS |
| `compare` | **DROP** | — | — | — |

`differences` is `split` with a SHARED knob: two narrow labelled columns, three paired
rows, then a single full-width row under a rule labelled *But the same:*. It is the
one-third comparison — the packable one, six prompts deep.

`compare` is retired. It was a plain two-column table at two thirds, and `venn` now
owns that slot with a shape a kid can see.

`split-two` now carries two prompts and both are word-and-gloss: how a greeting sounds
out loud, and the words a language has that English needs a sentence for. ROWS is set
per binding and matches the number of words the prompt asks for; the default of four
is not a licence to print four rows under a prompt that asks for one.

`table-3` survives on two prompts and both are genuinely three-column with several
rows: the languages people actually speak there, and the religions people actually
keep. A table earns its place when the answer has repeating rows, not when it has
three parts.

---

### The overlap — kind `venn` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `venn` | **NEW** | 2 | `{"labels":["There","Here"],"shared":"Both","lines_each":3}` | LABELS, SHARED, LINES_EACH |

Two overlapping circles, printed labels on each lobe and on the overlap, three faint
ruled guides inside each of the three zones.

`differences` holds the same data in a third of the space, and both are worth having.
The Venn is the one for a prompt whose answer *is* the overlap — the food they eat and
you eat and both of you eat — where the interesting finding is in the middle and the
sides are only there to define it.

---

### Sequence and change

| Form | | Thirds | Kind | Spec | Knobs |
|---|---|---|---|---|---|
| `timeline` | **KEEP** | 1 | `timeline` | `{"ticks":5,"unit":"years","ends":["",""]}` | TICKS, UNIT, ENDS |
| `flow-steps` | **NEW** | 1 | `flow` | `{"steps":4,"orient":"across","caption":""}` | STEPS, ORIENT, CAPTION |
| `then-now` | **NEW** | 2 | `pair` | `{"captions":["Before","After"],"lines_each":2,"middle":""}` | CAPTIONS, LINES_EACH, MIDDLE |
| `storyboard` | **KEEP** | 2 | `storyboard` | `{"panels":6}` | PANELS |

**`timeline`** gains UNIT and ENDS. `unit: "clock"` prints times rather than dates.
ENDS labels the two endpoints, and the labels are what stop two timelines in one
workbook from reading as the same page twice — a line from *1500* to *Today* and a
line from *Wake up* to *Bedtime* are visibly different objects. TICKS matches the
number of marks the prompt names; a five-tick line under a prompt that names three
moments prints two marks nobody was asked to fill.

**`flow-steps`** is boxes joined by arrows. A timeline is dates on a line; a flow is
*this causes the next thing*, which is a different question. How an ordinary person
becomes the leader. How a thing grown there ends up in your house.

**`then-now`** is two panels with an arrow between them. Three prompts are built as a
before and an after and currently print as one box, which throws the before away —
including the prompt that asks a kid to look at the most worn-out place in a country
and then draw it healed. On that one the form is the whole point.

MIDDLE is new and it is a short write-in line printed on the arrow itself, captioned
by the string. One prompt needs it: the date a country stopped belonging to somebody
else is neither the before nor the after, it is the hinge, and it belongs on the hinge.
Empty string prints no line, so the other two bindings are unaffected.

---

### Numbers

| Form | | Thirds | Kind | Spec | Knobs |
|---|---|---|---|---|---|
| `figure-anchor` | **NEW** | 1 | `figures` | `{"caption":"","unit":"","anchor_prompt":"About the same as…"}` | CAPTION, UNIT, ANCHOR_PROMPT |
| `scale-strip` | **NEW** | 1 | `chart` | `{"mode":"scale","orient":"vertical","marks":2,"unit":"","captions":["",""]}` | MODE, ORIENT, MARKS, UNIT, CAPTIONS |
| `bar-graph` | **NEW** | 2 | `chart` | `{"mode":"bars","bars":5,"orient":"vertical","scale_marks":5,"axis_label":"","caption":""}` | MODE, BARS, ORIENT, SCALE_MARKS, AXIS_LABEL, CAPTION |
| `figures` | **DROP** | — | — | — | — |

`figures` — three bare boxes with generic captions — is retired. The *kind* stays,
because `figure-anchor` is built on it.

**`figure-anchor`** is one large boxed number with its unit and a ruled line beneath
for the local comparison. Four prompts want one real number and something near home
that is about the same size. **The number in the box is always something the kid found,
never something they estimated** — a form that frames an invented figure the way it
frames a researched one teaches the wrong thing about both.

**`scale-strip`** is a ruled scale the kid labels, with two write-in markers on it.
Two temperatures on one thermometer, or a mountain drawn next to a building you know.
The same two numbers in two separate boxes are two numbers; on one axis they are a
picture — which is why neither of its prompts asks for the gap in words. The gap is
the picture.

**`bar-graph`** is a baseline, faint gridlines, write-in category slots, and an axis
the kid labels themselves. Nothing else in the library makes relative size visible.
`orient: "horizontal"` gives the ranked version — label at the left, track at the right.

---

### Icon arrays — kind `grid` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `hundred-people` | **NEW** | 2 | `{"rows":10,"per_row":10,"key_rows":4,"caption":"If this country were 100 people"}` | ROWS, PER_ROW, KEY_ROWS, KEY, CAPTION, LABEL_LINES |
| `pictograph` | **NEW** | 1 | `{"rows":2,"per_row":10,"key":"Each figure =","label_lines":true}` | ” |

One renderer, two shapes. `hundred-people` is a 10×10 block of empty squares with four
key rows below, each a small swatch box beside a ruled label line — the kid colors the
shares and writes the key themselves. `pictograph` is the same renderer at
`{"rows":2,"per_row":10}`: two rows of repeated figures with a *each figure = …* key.

**The key and the row length have to multiply to the whole.** Ten figures in a row
against a key of *each figure = 5 out of 100* caps the row at fifty and cannot draw a
country that is eighty percent urban. Both `pictograph` bindings set the key to ten per
figure, and any new one must do the arithmetic before it ships.

These are the only forms in the set that make a proportion visible rather than written
out. The block is for shares of a whole; the rows are for two quantities you compare by
counting. Keeping them one renderer with a GRID knob is also what stops three
demographics prompts in one week from printing three identical grids.

---

### Lists — kind `checklist`

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `list-n` | **NEW** | 1 | `{"items":5,"marker":"number","circle_one":false}` | ITEMS, LABELS, MARKER, CIRCLE_ONE, ORIENT, CAPTION |
| `checklist` | **KEEP** | 1 | `{"items":8,"labels":[],"marker":"box"}` | ” |
| `week-strip` | **NEW** | 1 | `{"labels":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"marker":"box","orient":"across","caption":""}` | ” |
| `bullets` | **NEW** | 1 | `{"items":5,"marker":"bullet","circle_one":false}` | ” |

Four forms, one renderer, distinguished by MARKER and ORIENT.

**`bullets` is n blank bullet points and nothing else.** MARKER gains a third value,
`bullet`, and that is the entire code change: the `checklist` renderer already emits
one `<li>` per item with a marker span and an empty label, so a bullet is a CSS rule
against a `<span class="bullet">` where the tick box goes.

It is in the set because nothing else in it asks a kid to decide what counts as a
finding. A ruled line invites a paragraph and takes whatever arrives; a `fields`
caption has already decided what the three findings are and leaves the kid filling in
blanks somebody else chose. A bullet does neither — it is a countable container that
says *one thing here, then stop and go find another*, which is the research skill
rather than a scaffold around it. It is also the smallest writing commitment on
paper, which is what the kid who stalls at four empty ruled lines needs, and the
reason it is a third and never two.

**A `bullets` prompt names the count and what a bullet is of.** "Five things in their
school bag" is the form working. "Notes" or "what you found out" is the form becoming
ruled lines with dots on them, which is the failure `fields` is guarded against by the
same rule. ITEMS and the number the prompt says must agree, and a `bullets` binding
that leaves ITEMS at its default is a bug in the binding.

`list-n` is numbered ruled lines — things you found. `checklist` is check-off boxes —
things you do or gather; it carries no prompt binding because week 4 composes it
directly for the project's materials and steps, and it must not be renamed or
repurposed for that reason. `week-strip` is the same boxes laid out across with day
labels printed, for the one prompt that asks which days a country rests.

`list-n` and `bullets` differ by whether the order is part of the answer. The rules of
a game and the countries around a border going clockwise are ordered and numbered;
five things in a bag, five subjects and four points of manners are not, and numbering
them tells a kid there is a first one to find when there isn't.

---

### The country itself — kind `map` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `map-marks` | **NEW** | 2 | `{"caption":"","pins":5}` | CAPTION, PINS (2–6) |

A large empty box framed as the country, with numbered pin circles printed down the
side, one ruled line each. The kid marks the map and names the marks in the key.

This is different from `label-it`'s callouts, which are leader lines off the edge of a
drawing and only work for a thing with parts. A numbered key works for marks scattered
across a shape — a river's source and mouth and one town on it, the capital and the
biggest city and one edge.

Two prompts are map tasks and both currently print as a one-third sketch box. **PINS is
never 1.** A numbered key with one entry is a caption wearing a costume; a prompt about
a single place belongs on `box-note`.

Available at three thirds if a country ever needs the room.

---

### Clocks — kind `clocks` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `clock-pair` | **NEW** | 1 | `{"faces":2,"captions":["Their clock","Our clock"],"digital_line":true,"lines":2}` | FACES, CAPTIONS, DIGITAL_LINE, LINES |

Two empty clock faces with twelve ticks each, a caption under each, a short ruled line
under each for writing the time in digits, and LINES ruled lines across the foot of the
form for the sentence its prompt asks for.

The cheapest renderer in the set and it serves one prompt — but that prompt is in week
1, which means every kid does it every month for nine months. Asking a child to write a
time in a table cell and asking them to draw the hands are not the same task.

---

### The recipe page — kind `recipe` · NEW RENDERER

| Form | | Thirds | Spec | Knobs |
|---|---|---|---|---|
| `recipe-card` | **NEW** | 3 | `{"ingredients":10,"steps":6,"sketch":true}` | INGREDIENTS, STEPS, SKETCH |

Dish name and a *Serves* line at the head. A narrow amount column beside ten ingredient
lines. Six numbered step lines. A box at the foot captioned *How it actually turned out.*

Three thirds is deliberate: it cannot pack with anything else, so the recipe always
lands on a clean sheet that can come out of the binder and go on the counter. The knobs
let a dessert run six ingredients and four steps without a second form.

---

## 2. The prompts

114 prompts. Week 1 is four fixed core tasks and one drawn from six candidates. Weeks
2 and 3 are five drawn from a focus-weighted pool, plus one fixed task in week 3.
Week 4 is the project sequence, five steps in order, one of six project types.

Wording is the ten-minute instruction in a kid's voice, and it names the things the
form has slots for. A prompt that asks for three things under a form with three
captions is one task; the same prompt over blank lines is a task plus a guess.

### Week 1 — the fixed opening

**`flag-draw`** · **KEEP** · form `box-beside` · page `flag` · tier `core`

> **Draw and color the flag**  
> Find your country's flag and copy it into your workbook. Get the colors right, then write one line about what you think the colors are for.

Spec: `{"caption":"Their flag, in their colors","lines":2}`

**`map-outline`** · **UPDATE** · form `map-marks` · page `map` · tier `core`

> **Trace the map and capital**  
> Find a map of your country and trace its outline big enough to fill the box. Then mark three places on it and number them: the capital, the biggest city that isn't the capital, and one edge — a coast, a mountain range, a border you'd notice.

Spec: `{"caption":"Your country","pins":3}`

**`neighbors-list`** · **UPDATE** · form `list-n` · page `map` · tier `core`

> **Find who your country borders**  
> Look at the map and list every country that shares a border with yours, going clockwise from the top. If there are more than eight, list the eight with the longest borders. If it's an island with no land borders, write down the nearest country across the water instead.

Spec: `{"items":8}`

**`language-hello`** · **UPDATE** · form `split-two` · page `language` · tier `core`

> **Say hello and thank you**  
> Find out what language people speak there and how to say "hello" and "thank you." Write each one twice: once copied the way they spell it, and once the way it sounds out loud.

Spec: `{"columns":["The way they spell it","The way it sounds"],"rows":2}`

**`currency-animal`** · **KEEP** · form `box-beside` · page `money` · tier `wild`

> **What is on their money?**  
> Find a picture of their money. Which animal, plant or person is on it? Draw it, then write who or what it is and why a country would choose to put that on its money.

**`national-symbol`** · **UPDATE** · form `box-note` · page `symbols` · tier `wild`

> **Draw the national symbol**  
> Find the country's coat of arms, national animal, or national flower. Draw it and write one sentence about why you think it was chosen.

Spec: `{"caption":"Their symbol","lines":2}`

**`how-many-people`** · **UPDATE** · form `figure-anchor` · page `people` · tier `wild`

> **How many people live there?**  
> Find out how many people live in your country. Write the number in the box, then find a US state — or a whole country you already know — with about the same number, so the number means something.

Spec: `{"caption":"People who live there","unit":"people","anchor_prompt":"About the same as…"}`

**`time-there-now`** · **UPDATE** · form `clock-pair` · page `map` · tier `wild`

> **Find out what time it is there**  
> Work out what time it is in their capital right now. Draw the hands on both clocks and write both times in digits underneath, then write one sentence about what people there are probably doing.

Spec: `{"captions":["Their clock","Our clock"],"lines":2}`

**`size-next-to-yours`** · **UPDATE** · form `figure-anchor` · page `map` · tier `wild`

> **How big is it really?**  
> Find out how much land the country covers. Write it in the box, then find a state or a country you already know that is about the same size.

Spec: `{"caption":"How much land","unit":"square miles","anchor_prompt":"About the same size as…"}`

**`anthem-listen`** · **UPDATE** · form `lines-4` · page `symbols` · tier `wild`

> **Listen to their anthem**  
> Find their national anthem and listen to the first thirty seconds. Write one word for how it sounds, and one line about what it says the country is, or hopes it will be.

### Week 2 — Deep Dive

**`first-people`** · **UPDATE** · form `fields` · page `history`

> **Find the first known people**  
> Find out who the earliest known people living in this land were and roughly when they were here. Find one thing they left behind that people can still see or dig up.

Spec: `{"captions":["Who they were","About when they were here","One thing they left behind"],"lines_each":1}`

**`ancient-site`** · **UPDATE** · form `box-note` · page `history`

> **Find an ancient site**  
> Find one ancient building, ruin, or site in this country that is hundreds or thousands of years old. Draw it, then write how old it is and how people know that.

Spec: `{"caption":"What is still standing","lines":2}`

**`made-there-first`** · **NEW** · form `box-note` · page `history`

> **Find something the world got from them**  
> Find one thing invented, written, painted, built or composed in this country that people outside it still use or still know. Draw it — or draw its cover — then write who made it and how it got out into the world.

Spec: `{"caption":"Made there first","lines":2}`

**`who-leads`** · **UPDATE** · form `flow-steps` · page `government`

> **Find out who leads the country**  
> Find out what this country's leader is called and how a person gets that job. Write the steps in order, from ordinary person to running the country.

Spec: `{"steps":4,"caption":"How a person gets that job"}`

**`law-you-notice`** · **UPDATE** · form `differences` · page `government`

> **Find three surprising rules**  
> Find three laws in this country that are different from where you live, and write each one next to how it works where you live. Then find one rule that is the same in both places.

Spec: `{"columns":["There","Here"],"rows":3,"shared":1}`

**`whats-in-the-news`** · **NEW** · form `lines-4` · page `government`

> **Find out what they are talking about**  
> Find a newspaper or news site published in this country and read one headline from this month — a machine translation is fine, and the odd broken sentence is part of it. Write what happened in your own words, the way you would tell it to somebody at dinner.

**`landforms`** · **UPDATE** · form `label-it` · page `land`

> **Describe the land**  
> Look at the land: mountains, desert, coastline, plains. Draw the whole country big enough to fill the page, then label six things on it — the highest part, the driest part, where the water is, where nobody lives, where most people do live, and the edge you would notice first if you arrived.

**`weather-there-now`** · **UPDATE** · form `scale-strip` · page `climate`

> **Check the weather there today**  
> Look up the temperature in their capital city right now and the temperature where you are. Mark both on the thermometer and label each mark.

Spec: `{"orient":"vertical","marks":2,"unit":"°F","captions":["Their weather","Our weather"]}`

**`wild-animal`** · **UPDATE** · form `box-note` · page `ecology`

> **Draw a wild animal**  
> Find one wild animal that lives in this country but not where you live. Draw it and write one fact about where it lives.

Spec: `{"caption":"An animal that lives there and not here","lines":2}`

**`animal-in-trouble`** · **UPDATE** · form `fields` · page `ecology`

> **Find an animal in trouble**  
> Find one animal from this country that scientists say is endangered. Find out one reason it is disappearing and roughly how many are left.

Spec: `{"captions":["The animal","Why it is disappearing","Roughly how many are left"],"lines_each":1}`

**`wild-place-protected`** · **UPDATE** · form `box-note` · page `ecology`

> **Find their biggest wild place**  
> Find the biggest national park or nature reserve in this country. Draw what it looks like, then name one animal that is safer because the park is there and write what it was in danger from.

Spec: `{"caption":"Their biggest wild place","lines":2}`

**`what-they-grow`** · **UPDATE** · form `fields` · page `land`

> **Find out what they grow**  
> Find the crop this country grows the most of. Find out which part of the country grows it, and one thing people there make or cook with it.

Spec: `{"captions":["The crop","Where in the country it grows","What they make with it"],"lines_each":1}`

**`made-here`** · **UPDATE** · form `flow-steps` · page `money`

> **Find something made there**  
> Find one thing this country makes and sells to the rest of the world. Check your own house for it first. Draw the trip it takes in four steps, from where it starts to somebody's house — and if you found one at home, that house is the last box.

Spec: `{"steps":4,"caption":"From there to here"}`

**`border-that-moved`** · **UPDATE** · form `then-now` · page `history`

> **Find a border that moved**  
> Find out how this country's borders have changed in the last two hundred years. Draw the shape it was then and the shape it is now, and write what changed between them — including its name, if that changed too.

Spec: `{"captions":["Two hundred years ago","Today"],"lines_each":2}`

**`before-history`** · **UPDATE** · form `box-beside` · page `prehistory`

> **Find something from before writing**  
> Find one fossil, cave painting or prehistoric find from this country that is still in the place it was found. Draw it, then write how long ago it got there and how anyone knows that.

Spec: `{"caption":"Still where it was found","lines":3}`

**`who-ruled-before`** · **UPDATE** · form `timeline` · page `history`

> **Find out who ruled before**  
> Start in 1500 and work forward to now. Mark up to five times this land changed hands — a king, an empire, a set of villages that ran themselves, a country that took over. Write who was in charge at each mark.

Spec: `{"ticks":5,"unit":"years","ends":["1500","Today"]}`

**`independence-day`** · **UPDATE** · form `then-now` · page `history`

> **Find the day they became a country**  
> Find out when this country started ruling itself and who it belonged to before that. Write the date on the arrow, then show who was in charge before and what people do on that day now.

Spec: `{"captions":["Who they belonged to","What they do now"],"lines_each":2,"middle":"The date"}`

**`war-that-changed`** · **UPDATE** · form `timeline` · page `history`

> **Find a fight that changed things**  
> Find one war or uprising that changed this country. Mark three moments on the line — when it started, the moment it turned, and when it ended — and write what happened at each one.

Spec: `{"ticks":3,"unit":"years","ends":["It started","It ended"]}`

**`who-can-vote`** · **UPDATE** · form `differences` · page `government`

> **Find out who gets a say**  
> Find three things about voting there: who is allowed to, how old you have to be, and how often they vote. Write each one next to how it works where you live, then one thing that is the same in both.

Spec: `{"columns":["There","Here"],"rows":3,"shared":1}`

**`kingdom-over-this-place`** · **KEEP** · form `lines-8` · page `government`

> **What the Kingdom fixes here**  
> Find one thing this country is struggling with right now: war, hunger, drought, a ruler nobody chose. Read Micah 4:1-4, then write two lines about what will be different here when the Kingdom comes.

**`river-that-matters`** · **UPDATE** · form `map-marks` · page `land`

> **Follow their biggest river**  
> Find the longest river in the country. Draw its whole path on the map, then number and name three places on it: where it starts, where it ends, and one town that sits on it. If the country's biggest water is a lake instead, draw the lake and the rivers that feed it.

Spec: `{"caption":"Their biggest river","pins":3}`

**`highest-point`** · **UPDATE** · form `scale-strip` · page `land`

> **Find the highest place**  
> Find the highest mountain or hill in the country and how high it is. Mark it on the scale, then find something near you — a building, a hill, a tower — and mark that too.

Spec: `{"orient":"vertical","marks":2,"unit":"feet","captions":["Their highest point","Something near me"]}`

**`under-the-ground`** · **UPDATE** · form `specimen-boxes` · page `land`

> **Find out what they dig up**  
> Find out what people take out of the ground there: oil, copper, salt, diamonds, stone, sand. Draw four of them and write what each one gets used for. If they only dig up one or two, fill the empty boxes with what they have to buy from somewhere else instead.

Spec: `{"boxes":4,"caption":"What comes out of their ground","label_lines":1}`

**`desert-shall-blossom`** · **UPDATE** · form `then-now` · page `land`

> **Find the land that needs healing**  
> Find the driest, most worn-out or most polluted place in this country and look at a photo of it. Draw what you see. Then read Isaiah 35:1-2 and draw that same place the way it will look when the land is healed.

Spec: `{"captions":["How it looks now","When the land is healed"],"lines_each":2}`

**`weather-that-hits`** · **UPDATE** · form `fields` · page `climate`

> **Find the weather they brace for**  
> Find out what kind of big weather this country gets: hurricanes, monsoons, drought, blizzards, floods. Find what time of year it comes and one way people get ready.

Spec: `{"captions":["What kind of big weather","What time of year it comes","One way people get ready"],"lines_each":1}`

**`tree-that-grows`** · **UPDATE** · form `specimen-boxes` · page `ecology`

> **Find a tree that grows there**  
> Find one tree or plant that grows well in this country. Draw a leaf from it, draw its fruit or its seed, and draw one thing people there make or eat from it.

Spec: `{"boxes":3,"caption":"The leaf, the fruit, and what they make","label_lines":1}`

**`oldest-thing-here`** · **UPDATE** · form `fields` · page `prehistory`

> **Find the oldest thing they keep**  
> Find the oldest object kept in one of this country's museums. Find out how old it is and where it was dug up.

Spec: `{"captions":["What it is","How old it is","Where it was dug up"],"lines_each":1}`

**`who-lives-there`** · **NEW** · form `hundred-people` · page `people`

> **Who lives there?**  
> Find out which groups of people make up this country and roughly what share each one is. Color your hundred people to match and write the key yourself. If the country doesn't count its people this way at all, write that on the key instead.

Spec: `{"key_rows":4,"caption":"If this country were 100 people"}`

**`how-many-languages`** · **NEW** · form `table-3` · page `people`

> **Count their languages**  
> Find four languages actually spoken there, not just the official one: the official one, the one most people speak at home, and two more — including one only a few thousand people still speak.

Spec: `{"columns":["The language","Who speaks it","Roughly how many"],"rows":4}`

**`family-size`** · **NEW** · form `differences` · page `people`

> **How big is a family there?**  
> Find the average number of children in a family there. Write it next to the number in our house, along with two more things about how families there are put together.

Spec: `{"columns":["Families there","Our house"],"rows":3,"shared":1}`

**`young-or-old`** · **NEW** · form `bar-graph` · page `people`

> **A country of kids or of grandparents?**  
> Find out how many people out of every hundred there are under 15, how many are between 15 and 65, and how many are over 65. Draw a bar for each.

Spec: `{"bars":3,"orient":"vertical","axis_label":"Out of every 100 people","scale_marks":5,"caption":"Under 15  ·  15 to 65  ·  Over 65"}`

**`who-finishes-school`** · **NEW** · form `pictograph` · page `people`

> **How far does learning go?**  
> Find out how many kids out of every hundred there finish secondary school, and how many go on to university. Color one row for each and label the rows.

Spec: `{"rows":2,"per_row":10,"key":"Each figure = 10 kids out of 100","label_lines":true}`

**`how-they-learn`** · **NEW** · form `bullets` · page `people`

> **Find out how kids there learn**  
> Find out whether school is free there, how many years a kid is required to go, and what it costs a family who has to pay. Then find out whether teaching your own children at home is allowed there, and roughly how many families do it. Write five things you found out, one to a bullet.

Spec: `{"items":5,"marker":"bullet","caption":"Five things about how kids there learn"}`

**`what-work-pays`** · **NEW** · form `bar-graph` · page `people`

> **What a week of work buys**  
> Find out what an ordinary job there pays in a week. Then find what bread, a bus ride and a pair of shoes cost there. Work out how many of each a week's pay buys, and draw a bar for each one.

Spec: `{"bars":3,"orient":"horizontal","axis_label":"What one week of pay buys","scale_marks":5,"caption":"Loaves of bread  ·  Bus rides  ·  Pairs of shoes"}`

**`how-long-they-live`** · **NEW** · form `figure-anchor` · page `people`

> **How long people live**  
> Find the average life expectancy there. Write it in the box, then write ours underneath and one reason for the gap between them.

Spec: `{"caption":"Life expectancy","unit":"years","anchor_prompt":"Ours is… and one reason for the gap"}`

**`who-came-and-who-left`** · **NEW** · form `fields` · page `people`

> **Who came and who left**  
> Find out where people there have moved from, and where people from there have moved to. Name the two countries most tied to this one by people moving, and one reason they went.

Spec: `{"captions":["They came from","They moved to","Why they went"],"lines_each":1}`

### Week 3 — Deep Dive

**`kid-life`** · **UPDATE** · form `timeline` · page `people`

> **A day in their life**  
> Walk through an ordinary day for a kid your age there, from waking up to going to bed. Mark five moments on the line and write what is happening at each one.

Spec: `{"ticks":5,"unit":"clock","ends":["Wake up","Bedtime"]}`

**`what-every-kid-learns`** · **NEW** · form `bullets` · page `people`

> **What a kid there is expected to know**  
> Find out what subjects kids there are taught between about six and eleven years old. Write five of them, one to a bullet. Then in the sixth bullet, write one thing families there teach their own children that nobody teaches in a school.

Spec: `{"items":6,"marker":"bullet","caption":"Five subjects, then one thing taught at home"}`

**`what-they-can-plug-in`** · **NEW** · form `bar-graph` · page `people`

> **What they can plug in**  
> Out of every hundred people there, find out how many have electricity at home, how many have a phone of their own, and how many can get on the Internet. Draw a bar for each.

Spec: `{"bars":3,"orient":"vertical","axis_label":"Out of every 100 people","scale_marks":5,"caption":"Electricity  ·  A phone  ·  The Internet"}`

**`hear-from-a-kid`** · **NEW** · form `lines-4` · page `people`

> **Hear it from someone who lives there**  
> Find a kid or a young person from this country describing their own life — a video, an interview, a letter, a school project posted online. Write down one thing they said that you would never have guessed from anything else you found this month.

**`life-outdoors`** · **KEEP** · form `box-beside` · page `people`

> **Find what they do outside**  
> Find out what people there do outdoors: hiking, fishing, herding, surfing, skiing. Pick one and draw somebody doing it, then write where in the country people do it and why the land there suits it.

**`what-people-believe`** · **UPDATE** · form `table-3` · page `culture`

> **Find the main religion**  
> Find out what religion or religions people practice there and roughly how many follow each. For the biggest one, name a day it keeps.

Spec: `{"columns":["The religion","Roughly how many","A day it keeps"],"rows":4}`

**`tonights-dinner`** · **UPDATE** · form `box-beside` · page `food`

> **Plan tonight's dinner there**  
> Find a dish people eat there on an ordinary weeknight, not a feast day. Draw the plate the way it would come to the table, write what's on it, and write the one thing you would have to go looking for to make it at your house.

**`animals-on-the-menu`** · **UPDATE** · form `venn` · page `food`

> **Find the animals they eat**  
> Find out which animals people raise or catch for food in this country. Write the ones only they eat on their side, the ones only you eat on yours, and the ones both of you eat in the middle. Different isn't gross, just different.

Spec: `{"labels":["They eat","We eat"],"shared":"Both","lines_each":3}`

**`story-they-tell`** · **UPDATE** · form `storyboard` · page `culture`

> **Find a story they tell**  
> Find a folk tale, legend, or myth from this country. Tell the whole thing in six pictures, start to finish. If a panel needs a word to make sense, write it inside the panel.

Spec: `{"panels":6}`

**`who-is-famous`** · **KEEP** · form `box-beside` · page `people`

> **Find someone everyone knows**  
> Find one person from this country that almost everyone there would recognize. Draw the thing they are known for — the ball, the instrument, the book, the medal — then write who they are and what they did.

**`holiday-they-mark`** · **UPDATE** · form `fields` · page `culture`

> **Find their biggest holiday**  
> Find the one day of the year this whole country celebrates. Find what it remembers and one thing people do on it.

Spec: `{"captions":["The day","What it remembers","What people do"],"lines_each":1}`

**`craft-of-the-land`** · **UPDATE** · form `specimen-boxes` · page `culture`

> **Find their craft or art**  
> Find one traditional art or craft from this country: weaving, pottery, painting, carving. Find a picture of the pattern and draw it four times, the way it would repeat across a real rug, pot or cloth. Label the colors.

Spec: `{"boxes":4,"caption":"The same pattern, four times","label_lines":1}`

**`sound-of-the-country`** · **UPDATE** · form `fields` · page `culture`

> **Listen to their music**  
> Find one traditional instrument or style of music from this country and listen to a minute of it. Find out what the instrument is made of, and write one word for how it sounds.

Spec: `{"captions":["Instrument or style","What it is made of","One word for how it sounds"],"lines_each":1}`

**`before-you-visit`** · **NEW** · form `bullets` · page `culture`

> **Four things to know before you knock**  
> Find out what counts as polite there and what would embarrass a visitor: shoes, greetings, hands, gifts, how loud to be, what you call somebody older than you. Write four things you would want to know before the door opened, one to a bullet.

Spec: `{"items":4,"marker":"bullet","caption":"Four things a visitor should know"}`

**`the-sport-they-love`** · **UPDATE** · form `differences` · page `culture`

> **Find their favorite sport**  
> Find the most popular sport in this country. Write three of its rules next to the rules of a game you play, then one rule both games share.

Spec: `{"columns":["Their game","A game I play"],"rows":3,"shared":1}`

**`wow-fact`** · **KEEP** · form `lines-4` · page `culture`

> **Find one wow fact**  
> Dig until you find one fact about this country that makes you say "wow." Write it in your own words.

**`landmark-to-see`** · **KEEP** · form `box-beside` · page `landmarks`

> **Pick a landmark to visit**  
> Find one famous place in this country you'd want to visit. Draw it and write one sentence about what makes it special.

**`girls-and-women`** · **UPDATE** · form `differences` · page `people`

> **Find out how girls grow up there**  
> Find out what learning and work look like for girls and women in this country. Write three things next to how they are where you live, then one thing that is the same.

Spec: `{"columns":["Girls there","Girls here"],"rows":3,"shared":1}`

**`city-and-country`** · **UPDATE** · form `pictograph` · page `people`

> **City or countryside?**  
> Find out how many people out of every hundred there live in cities and how many live out in the countryside. Color a row for each, then label one row with their biggest city and the other with the part of the country most of the farming happens in.

Spec: `{"rows":2,"per_row":10,"key":"Each figure = 10 people out of 100","label_lines":true}`

**`word-they-have`** · **NEW** · form `split-two` · page `language`

> **Find a word we don't have**  
> Find two words in their language that take a whole sentence to say in English — a feeling, a kind of weather, a thing people do together, a time of day. Write each word the way they spell it, and next to it the sentence it takes us.

Spec: `{"columns":["Their word","What it takes us a sentence to say"],"rows":2}`

**`getting-around`** · **UPDATE** · form `figure-anchor` · page `people`

> **Find out how they get around**  
> Find out how people there travel to work, to market and to school. Find out how long an ordinary kid's trip takes and write it in the box, then write the longest trip anyone in our house makes in a week.

Spec: `{"caption":"An ordinary trip there","unit":"minutes","anchor_prompt":"Our longest weekly trip is…"}`

**`house-they-live-in`** · **UPDATE** · form `label-small` · page `people`

> **Draw an ordinary house**  
> Find a picture of an ordinary home in this country, not a palace. Draw it and label three things the weather or the land made necessary.

Spec: `{"caption":"Draw it, then label the parts","callouts":3}`

**`game-kids-play`** · **UPDATE** · form `list-n` · page `people`

> **Learn a game kids play there**  
> Find a game kids play in this country. Write the rules in three lines, then go play one round of it.

Spec: `{"items":3}`

**`what-a-kid-carries`** · **NEW** · form `bullets` · page `people`

> **What's in their bag**  
> Find out what a kid your age there carries with them on an ordinary day. List five things, one to a bullet. If one of them is something you have never had to carry, put a star next to it.

Spec: `{"items":5,"marker":"bullet","caption":"Five things a kid there carries"}`

**`their-rest-day`** · **UPDATE** · form `week-strip` · page `people`

> **Find their day off**  
> Find out which days are the weekend in this country and which day people rest. Shade those days, then write what closes on their rest day, if anything does.

Spec: `{"labels":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"caption":"Shade the days most people do not work"}`

**`sabbath-keepers-there`** · **UPDATE** · form `fields` · page `culture`

> **Find who keeps the seventh day**  
> Find out whether anyone in this country keeps a seventh-day Sabbath — Adventists, a Church of God, Jewish or Messianic congregations. Find what they are called there, roughly how many there are, and when and where they meet.

Spec: `{"captions":["What they are called there","Roughly how many","When and where they meet"],"lines_each":1}`

**`feast-they-keep`** · **KEEP** · form `lines-8` · page `culture`

> **Find their harvest feast**  
> Find the biggest harvest or thanksgiving festival in this country and what happens at it. Read Zechariah 14:16, then write one line about the part of it that could still be kept when all nations come up to keep the Feast.

**`place-of-worship`** · **UPDATE** · form `box-note` · page `culture`

> **Draw where they worship**  
> Find a church, mosque, temple or shrine in this country. Draw the outside, and write one line about what happens inside on their main day.

Spec: `{"caption":"Draw the outside","lines":2}`

**`what-they-wear`** · **UPDATE** · form `label-small` · page `culture`

> **Draw what they wear**  
> Find what people there wear for a wedding, a holiday or a festival. Draw one outfit and label three parts: the one that says where it's from, the one made by hand, and the one you'd wear yourself.

Spec: `{"caption":"Draw the outfit, then label three parts","callouts":3}`

**`breakfast-there`** · **UPDATE** · form `venn` · page `food`

> **Eat their breakfast**  
> Find out what people eat for breakfast in this country. Write what is on their plate on their side, what is on yours on yours, and anything that turns up on both in the middle.

Spec: `{"labels":["Their breakfast","Our breakfast"],"shared":"Both","lines_each":3}`

**`market-day`** · **UPDATE** · form `specimen-boxes` · page `food`

> **Walk through their market**  
> Find a photo of a market in this country. Draw four things being sold in it and label each one, then circle the one you have never seen for sale where you live.

Spec: `{"boxes":4,"caption":"Four things for sale","label_lines":1,"circle_one":true}`

**`famous-dish`** · **NEW** · form `fields` · page `food`

> **The dish they're known for**  
> Find the one dish a person from this country would name first if you asked what to eat there. Write what goes in it and one reason it became the famous one.

Spec: `{"captions":["What it is called","What goes in it","Why this one"],"lines_each":1}`

**`school-lunch`** · **UPDATE** · form `differences` · page `food`

> **What kids eat in the middle of the day**  
> Find out what a kid your age there eats in the middle of the day, who cooks it, and whether the family pays for it. Write each one next to how lunch works at our house.

Spec: `{"columns":["Their lunch","Our lunch"],"rows":3,"shared":1}`

**`something-sweet`** · **NEW** · form `box-beside` · page `food`

> **Find something sweet**  
> Find a dessert, cake or sweet people there make for special days. Draw it, then write what makes it sweet — honey, dates, sugar cane, fruit — and what day of the year people there make it for.

**`street-food`** · **NEW** · form `fields` · page `food`

> **What they'd buy with their own money**  
> Find one thing sold from a stall or a cart there that a kid could buy with their own coins. Find out where you would buy it and what it costs.

Spec: `{"captions":["What it is","Where you would buy it","What it costs"],"lines_each":1}`

**`holiday-dish`** · **NEW** · form `fields` · page `food`

> **The food that only comes once a year**  
> Find the dish people there only make for one holiday. Write which day it belongs to and one reason it's saved for that day.

Spec: `{"captions":["The dish","The day it belongs to","Why it waits"],"lines_each":1}`

**`drink-with-dinner`** · **NEW** · form `lines-4` · page `food`

> **What's in their cup**  
> Find out what people there drink with a meal: tea, coffee, juice, milk, something you've never heard of. Write how it's made and whether it's served hot or cold.

**`cook-it`** · **NEW** · form `recipe-card` · page `food` · tier `fixed`

> **Cook one thing from your country**  
> Pick one dish from anything you found this month and find a real recipe for it. Copy it onto your recipe page in your own handwriting, then make it with a grown-up. Write down what you'd change next time.

Spec: `{"ingredients":10,"steps":6,"sketch":true}`

### Week 4 — the project sequence

Thirty rows, six project types, five steps each, all `KEEP`. Week 4 is composed rather than
packed: the project type's materials print as a checklist, its five steps as check-off lines,
and the one planning task carries a storyboard. Only the six `-choose` rows are bound.

| Key | Title | Status | Form |
|---|---|---|---|
| `zine-choose` | Plan your pages | KEEP | `storyboard` |
| `zine-gather` | Gather your drawings and pens | KEEP | — (composed) |
| `zine-draw-first` | Draw the cover and first pages | KEEP | — (composed) |
| `zine-draw-rest` | Finish the pages | KEEP | — (composed) |
| `zine-present` | Read your zine out loud | KEEP | — (composed) |
| `model-choose` | Decide what you will build | UPDATE | `storyboard` `{"panels":2}` |
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
| `trifold-choose` | Plan your three panels | UPDATE | `storyboard` `{"panels":3}` |
| `trifold-gather` | Gather your materials | KEEP | — (composed) |
| `trifold-build-left-and-center` | Build the left and center panels | KEEP | — (composed) |
| `trifold-build-right-and-finishing` | Finish the right panel | KEEP | — (composed) |
| `trifold-present` | Rehearse and present your board | KEEP | — (composed) |
| `video-choose` | Plan your shots | KEEP | `storyboard` |
| `video-gather` | Gather what you will film | KEEP | — (composed) |
| `video-shoot` | Film your shot list | KEEP | — (composed) |
| `video-edit` | Cut it together | KEEP | — (composed) |
| `video-present` | Show your video | KEEP | — (composed) |

Wording for all thirty is unchanged. Two carry a new panel count because the artifact has
a fixed number of faces: a trifold board has three panels, a model has a side view and a top view.

---

## 3. Bindings, focuses, and the numbers

### How many prompts want each form

| Form | Thirds | Wk 1 | Wk 2 | Wk 3 | Total | Prompts |
|---|---|---|---|---|---|---|
| `fields` | 1 | · | 6 | 6 | **12** | `animal-in-trouble`, `first-people`, `oldest-thing-here`, `weather-that-hits`, `what-they-grow`, `who-came-and-who-left`, `famous-dish`, `holiday-dish`, `holiday-they-mark`, `sabbath-keepers-there`, `sound-of-the-country`, `street-food` |
| `box-beside` | 1 | 2 | 1 | 5 | **8** | `currency-animal`, `flag-draw`, `before-history`, `landmark-to-see`, `life-outdoors`, `something-sweet`, `tonights-dinner`, `who-is-famous` |
| `differences` | 1 | · | 3 | 3 | **6** | `family-size`, `law-you-notice`, `who-can-vote`, `girls-and-women`, `school-lunch`, `the-sport-they-love` |
| `box-note` | 2 | 1 | 4 | 1 | **6** | `national-symbol`, `ancient-site`, `made-there-first`, `wild-animal`, `wild-place-protected`, `place-of-worship` |
| `lines-4` | 1 | 1 | 1 | 3 | **5** | `anthem-listen`, `whats-in-the-news`, `drink-with-dinner`, `hear-from-a-kid`, `wow-fact` |
| `figure-anchor` | 1 | 2 | 1 | 1 | **4** | `how-many-people`, `size-next-to-yours`, `how-long-they-live`, `getting-around` |
| `specimen-boxes` | 2 | · | 2 | 2 | **4** | `tree-that-grows`, `under-the-ground`, `craft-of-the-land`, `market-day` |
| `bullets` | 1 | · | 1 | 3 | **4** | `how-they-learn`, `before-you-visit`, `what-a-kid-carries`, `what-every-kid-learns` |
| `then-now` | 2 | · | 3 | · | **3** | `border-that-moved`, `desert-shall-blossom`, `independence-day` |
| `timeline` | 1 | · | 2 | 1 | **3** | `war-that-changed`, `who-ruled-before`, `kid-life` |
| `bar-graph` | 2 | · | 2 | 1 | **3** | `what-work-pays`, `young-or-old`, `what-they-can-plug-in` |
| `map-marks` | 2 | 1 | 1 | · | **2** | `map-outline`, `river-that-matters` |
| `list-n` | 1 | 1 | · | 1 | **2** | `neighbors-list`, `game-kids-play` |
| `flow-steps` | 1 | · | 2 | · | **2** | `made-here`, `who-leads` |
| `scale-strip` | 1 | · | 2 | · | **2** | `highest-point`, `weather-there-now` |
| `lines-8` | 2 | · | 1 | 1 | **2** | `kingdom-over-this-place`, `feast-they-keep` |
| `table-3` | 2 | · | 1 | 1 | **2** | `how-many-languages`, `what-people-believe` |
| `pictograph` | 1 | · | 1 | 1 | **2** | `who-finishes-school`, `city-and-country` |
| `venn` | 2 | · | · | 2 | **2** | `animals-on-the-menu`, `breakfast-there` |
| `label-small` | 2 | · | · | 2 | **2** | `house-they-live-in`, `what-they-wear` |
| `split-two` | 1 | 1 | · | 1 | **2** | `language-hello`, `word-they-have` |
| `clock-pair` | 1 | 1 | · | · | **1** | `time-there-now` |
| `label-it` | 3 | · | 1 | · | **1** | `landforms` |
| `hundred-people` | 2 | · | 1 | · | **1** | `who-lives-there` |
| `storyboard` | 2 | · | · | 1 | **1** | `story-they-tell` |
| `week-strip` | 1 | · | · | 1 | **1** | `their-rest-day` |
| `recipe-card` | 3 | · | · | 1 | **1** | `cook-it` |
| `checklist` | 1 | · | · | · | **0** | week 4, composed — not bound to a prompt |

Twenty-eight forms carry 84 bindings across weeks 1–3, plus `checklist` and
`storyboard` doing week 4's composed sheet. No form is bound to nothing.

`bullets` carries four bindings and every one of them names its count: five things in a
bag, five things about how kids learn, five subjects and a sixth thing taught at home,
four things to know before you knock. That is the form working as designed, and it is
also where new prompts should go before they go to `fields`.

### What one printed week actually looks like

Five tasks are drawn from each Deep Dive week's pool, weighted by focus. These are the
expected shares over 40,000 simulated draws on a fresh library — the chance that a given
slot on the sheet is a given form.

| Focus | Week 2, most likely forms | Week 3, most likely forms |
|---|---|---|
| **Ancient World** | fields 19% · box-note 15% · timeline 11% · differences 6% | fields 15% · box-beside 13% · bullets 9% · specimen-boxes 7% |
| **Wild Places** | fields 16% · box-note 16% · then-now 10% · scale-strip 8% | box-beside 18% · fields 13% · venn 8% · label-small 8% |
| **People and Power** | differences 13% · fields 12% · flow-steps 11% · then-now 9% | fields 15% · box-beside 13% · differences 12% · bullets 9% |
| **Food and Craft** | fields 20% · box-note 12% · specimen-boxes 11% · flow-steps 8% | fields 17% · box-beside 12% · venn 10% · specimen-boxes 10% |
| **Conflict and Change** | fields 19% · then-now 13% · differences 10% · box-note 8% | fields 20% · box-beside 14% · differences 10% · lines-4 10% |
| **Land and Sky** | fields 20% · scale-strip 11% · then-now 10% · box-note 8% | box-beside 18% · fields 13% · differences 10% · label-small 8% |
| **Who Lives Here** | fields 12% · bar-graph 11% · differences 9% · box-note 8% | box-beside 12% · differences 12% · fields 11% · bullets 9% |

Worst case in the whole table: **Conflict and Change, week 3, `fields` at 20%** — one
slot in five. Every other cell is lower. Two focus-weeks now have no form above 16%.

### The focus table

Sparse and opinion-only: a missing row means weight 1, and there are no zeros. A prompt one
focus treats as a centerpiece stays reachable in every other focus's month.

| Focus | Week 2 favorites (weight 3) | Week 3 favorites (weight 3) |
|---|---|---|
| **Ancient World** | `ancient-site`, `before-history`, `first-people`, `how-many-languages`, `made-there-first`, `oldest-thing-here`, `war-that-changed`, `who-ruled-before` | `before-you-visit`, `craft-of-the-land`, `feast-they-keep`, `landmark-to-see`, `place-of-worship`, `sabbath-keepers-there`, `story-they-tell`, `word-they-have` |
| **Wild Places** | `animal-in-trouble`, `desert-shall-blossom`, `highest-point`, `river-that-matters`, `tree-that-grows`, `wild-animal`, `wild-place-protected` | `animals-on-the-menu`, `getting-around`, `house-they-live-in`, `landmark-to-see`, `life-outdoors` |
| **People and Power** | `how-they-learn`, `independence-day`, `kingdom-over-this-place`, `law-you-notice`, `made-here`, `whats-in-the-news`, `what-work-pays`, `who-can-vote`, `who-leads` | `city-and-country`, `girls-and-women`, `holiday-they-mark`, `kid-life`, `school-lunch`, `their-rest-day`, `what-every-kid-learns`, `what-they-can-plug-in`, `who-is-famous` |
| **Food and Craft** | `landforms`, `made-here`, `made-there-first`, `oldest-thing-here`, `tree-that-grows`, `under-the-ground`, `what-they-grow` | `animals-on-the-menu`, `before-you-visit`, `breakfast-there`, `craft-of-the-land`, `famous-dish`, `feast-they-keep`, `holiday-dish`, `market-day`, `tonights-dinner`, `what-they-wear` |
| **Conflict and Change** | `animal-in-trouble`, `border-that-moved`, `independence-day`, `kingdom-over-this-place`, `law-you-notice`, `war-that-changed`, `whats-in-the-news`, `who-came-and-who-left` | `girls-and-women`, `hear-from-a-kid`, `holiday-they-mark`, `sabbath-keepers-there`, `what-people-believe`, `who-is-famous` |
| **Land and Sky** | `desert-shall-blossom`, `highest-point`, `landforms`, `river-that-matters`, `weather-that-hits`, `weather-there-now`, `what-they-grow` | `city-and-country`, `getting-around`, `house-they-live-in`, `landmark-to-see`, `life-outdoors`, `the-sport-they-love` |
| **Who Lives Here** | `family-size`, `how-long-they-live`, `how-many-languages`, `how-they-learn`, `what-work-pays`, `who-finishes-school`, `who-lives-there`, `young-or-old` | `city-and-country`, `girls-and-women`, `hear-from-a-kid`, `kid-life`, `school-lunch`, `their-rest-day`, `what-every-kid-learns`, `what-they-can-plug-in`, `who-is-famous`, `word-they-have` |

108 weight-3 rows in total, 54 in each Deep Dive week. Every focus holds at least five in
each week, which is the floor the draw needs to stop feeling like one deck.

### Paper

| Week | What prints | Thirds | Sheets |
|---|---|---|---|
| 1 | 4 core + 1 drawn | 6.2 | 2.1 |
| 2 | 5 drawn | 7.4 | 2.5 |
| 3 | 5 drawn | 6.5 | 2.2 |
| 3 | `cook-it`, always | 3.0 | 1.0 — its own sheet |
| 4 | composed | 3.0 | 1.0 |
| | | | **8.8 a month** |

Call it nine sheets a person a month. The recipe page is a full sheet every month by
design; everything else roughly holds, because most of the new forms are one third
replacing one third. `specimen-boxes` and `map-marks` at two thirds where a one-third
box used to sit are what the increase buys. The eight new prompts add no paper: six are
one third, and the two-thirds pair sits in pools that already averaged more than that.

Twenty-six sheets a month across three learners, about 238 over a nine-month year.

### The seventh focus

**Who Lives Here** — *Who the people are, how many of them, and how they live.*

Nine demographics prompts in week 2 and ten people prompts in week 3 carry a lens of its
own, and it gives a learner a way to choose this deliberately rather than hoping the draw
serves it. Week 2 previously had no people page at all — it was land, history, government,
ecology — while week 3 carried nine. This balances both weeks and keeps the new prompts
from swamping either draw.

`who-came-and-who-left` sits at weight 1 rather than 3 so the week is not the same
handful of prompts every time it is chosen.

**Country affinities.** A focus with no `country_focus_affinity` rows is never
recommended for any country, on any country card, forever. The other six average 33
rows across 100 countries. Who Lives Here needs its own set — roughly 20 countries with
a one-line reason each — or it ships as the one focus the app never has an opinion
about.

### The fixed slot

`cook-it` is tier `fixed`. Week 3 is five weighted draws plus every week-3 fixed-tier
prompt appended unconditionally, so the week holds six tasks and a month holds 21. It
never enters weighted selection, never gets a recency score, and is never swappable.

It breaks the ten-minute rule on purpose, and it should not be a coin flip. At a normal
weight it would land three or four months out of nine, which would make the best part
of the month optional.

---

## 4. What this implies for the build

Briefly, because the point of this document is the endstate, not the route to it.

**Ten new renderers.** `fields`, `boxes`, `venn`, `flow`, `pair`, `chart`, `grid`,
`map`, `clocks`, `recipe`. Each is a branch in `worksheet.js` and a block in
`print.css`, and each height has to be measured against real paper before it is
trusted. Five forms cost nothing extra because they ride existing renderers:
`differences` on `split`, `list-n`, `week-strip` and `bullets` on `checklist`,
`figure-anchor` on `figures`.

**Four knobs on renderers.** `bullets` needs MARKER to accept `bullet` in the
`checklist` branch and one CSS rule where the tick box is drawn. `box-note` needs BELOW
on the `box` branch: at `lines > 0` that branch already builds the box and the rules as
two children of `.beside`, so BELOW stacks them instead of setting them side by side,
and `print.css` carries the one flex-direction that does it. `then-now` needs MIDDLE on
the new `pair` branch — a captioned write-in line drawn on the arrow, skipped when the
string is empty. `clock-pair` needs LINES on the new `clocks` branch — n ruled lines
across the foot, the same rule `lines` already uses. The first two are not new `kinds`,
so neither waits on the CHECK-constraint rebuild below; the last two ride renderers
that are new anyway.

**Two schema facts decide the sequencing.** `worksheet_layouts.kind` and
`task_templates.tier` are both CHECK constraints inside migrations that have already
applied, and SQLite cannot alter a CHECK — the new kinds and the `fixed` tier both need
a table rebuild before a single new form row will insert. A `fixed` column on
`task_templates` is one `ALTER TABLE ADD COLUMN` and does the same job as the tier.

**Seeds only insert.** Every seed statement is `ON CONFLICT DO NOTHING` and every
binding is guarded on `worksheet_layout_id IS NULL`, so new forms, new prompts and new
weights land through a seed file, while every UPDATE and KEEP-with-a-new-spec in this
document needs a migration. That is the right shape anyway: a migration runs once and
never stomps a layout retuned in the library editor afterwards.

**Build order, if it is split.** `specimen-boxes`, `venn`, `bar-graph` and `map-marks`
first. Those four alone take the top form in a week from 44% to 20% and move the most
prompts off a shape that fights them. `then-now`, `flow-steps`, `scale-strip`,
`pictograph`, `clock-pair` and `week-strip` second. `recipe-card` and the fixed slot
last, because that one changes what a month is and not just what a page looks like.
