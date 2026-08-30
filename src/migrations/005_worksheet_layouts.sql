-- 005_worksheet_layouts.sql — the printed forms, and which task wants
-- which one (DESIGN.md §16, §13).
--
-- A seed, not a migration: Run seed re-executes it on every press, every insert
-- is ON CONFLICT DO NOTHING, and every binding is guarded on the column still
-- being empty. A layout retuned in the library editor and a binding changed
-- there both survive every future press, which is the whole point of there
-- being twenty-eight forms rather than ninety worksheets.
--
-- The table and the two columns come from 004_worksheets.sql, which is a
-- migration and applies once. Pressing Run seed before Apply pending fails on
-- the first statement here and names it.
--
-- A layout's `spec` is JSON and it is data, never markup. The renderer reads
-- the keys it knows for that `kind`, escapes every string, and drops everything
-- else — the library editor puts a form in front of these fields and a printed
-- page must not be reachable from it as an injection surface.
--
-- HEIGHTS ARE THE LOAD-BEARING NUMBER. A sheet holds three thirds and a segment
-- never splits across a page break, so a layout that overflows its declared
-- height pushes the next segment off the paper. Change a height before you
-- change anything else about a form.

-- ---------------------------------------------------------------------------
-- The forms. Twelve from slice 10, five slice 12 adds — `specimen-boxes`,
-- `venn`, `bar-graph`, `scale-strip`, `map-marks` — eight slice 13 adds:
-- `then-now`, `flow-steps`, `hundred-people`, `pictograph`, `clock-pair`,
-- `list-n`, `bullets`, `week-strip` — four slice 14 adds: `fields`,
-- `box-note`, `label-small`, `differences` — and two slice 15 adds:
-- `figure-anchor`, `recipe-card`. `box-caption` retires in slice 14: its six
-- prompts move to `box-note` and (for `map-outline`) `map-marks`. `compare`
-- and the old three-box `figures` form retire in slice 15: `size-next-to-yours`
-- and `how-many-people` move to `figure-anchor` (LIBRARY_v3.md §1).
-- ---------------------------------------------------------------------------
INSERT INTO worksheet_layouts (slug, name, kind, height_thirds, spec) VALUES
  ('lines-4', 'Four ruled lines', 'lines', 1,
   '{"lines":4}'),
  ('lines-8', 'Eight ruled lines', 'lines', 2,
   '{"lines":8}'),
  ('fields', 'Labelled short answers', 'fields', 1,
   '{"captions":["","",""],"lines_each":1}'),
  ('box-beside', 'Small box with notes beside it', 'box', 1,
   '{"caption":"Sketch it","lines":4,"callouts":0,"below":false}'),
  ('box-note', 'Drawing box with notes below', 'box', 2,
   '{"caption":"Draw it here","lines":2,"callouts":0,"below":true}'),
  ('label-small', 'Small box with a few labels', 'box', 2,
   '{"caption":"Draw it, then label the parts","lines":0,"callouts":3,"below":false}'),
  ('split-two', 'Two labelled columns', 'split', 1,
   '{"columns":["Their word","How it sounds"],"rows":4,"shared":0}'),
  ('differences', 'There, here, and the one that is the same', 'split', 1,
   '{"columns":["There","Here"],"rows":3,"shared":1}'),
  ('table-3', 'Three-column table', 'table', 2,
   '{"columns":["What","Where","Why it matters"],"rows":6}'),
  ('timeline', 'Dates on a line', 'timeline', 1,
   '{"ticks":5,"unit":"years","ends":["",""]}'),
  ('figure-anchor', 'One big number, with something to compare it to', 'figures', 1,
   '{"caption":"","unit":"","anchor_prompt":"About the same as…"}'),
  ('label-it', 'One big sketch with callouts', 'box', 3,
   '{"caption":"Draw it big, then label the parts","lines":0,"callouts":6,"below":false}'),
  ('checklist', 'Check-off list', 'checklist', 1,
   '{"items":8,"labels":[],"marker":"box","circle_one":false,"orient":"list","caption":""}'),
  ('storyboard', 'Six-panel storyboard', 'storyboard', 2,
   '{"panels":6,"caption":""}'),
  ('specimen-boxes', 'Several boxes, each labelled', 'boxes', 2,
   '{"boxes":4,"caption":"","label_lines":1,"circle_one":false}'),
  ('venn', 'The overlap', 'venn', 2,
   '{"labels":["There","Here"],"shared":"Both","lines_each":3}'),
  ('bar-graph', 'A bar for each number', 'chart', 2,
   '{"mode":"bars","orient":"vertical","bars":5,"scale_marks":5,"marks":2,"unit":"","axis_label":"","caption":"","captions":["",""]}'),
  ('scale-strip', 'A scale with write-in marks', 'chart', 1,
   '{"mode":"scale","orient":"vertical","bars":5,"scale_marks":5,"marks":2,"unit":"","axis_label":"","caption":"","captions":["",""]}'),
  ('map-marks', 'The country itself, numbered pins', 'map', 2,
   '{"caption":"","pins":5}'),
  ('then-now', 'Before and after, joined by an arrow', 'pair', 2,
   '{"captions":["Before","After"],"lines_each":2,"middle":""}'),
  ('flow-steps', 'Steps in order', 'flow', 1,
   '{"steps":4,"orient":"across","caption":""}'),
  ('hundred-people', 'A hundred people, colored in', 'grid', 2,
   '{"rows":10,"per_row":10,"key_rows":4,"key":"","caption":"If this country were 100 people","label_lines":false}'),
  ('pictograph', 'Two rows of ten', 'grid', 1,
   '{"rows":2,"per_row":10,"key_rows":0,"key":"Each figure =","caption":"","label_lines":true}'),
  ('clock-pair', 'Two clocks', 'clocks', 1,
   '{"faces":2,"captions":["Their clock","Our clock"],"digital_line":true,"lines":2}'),
  ('list-n', 'A numbered list', 'checklist', 1,
   '{"items":5,"labels":[],"marker":"number","circle_one":false,"orient":"list","caption":""}'),
  ('bullets', 'Blank bullets', 'checklist', 1,
   '{"items":5,"labels":[],"marker":"bullet","circle_one":false,"orient":"list","caption":""}'),
  ('week-strip', 'The week, shaded', 'checklist', 1,
   '{"items":7,"labels":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"marker":"box","circle_one":false,"orient":"across","caption":""}'),
  ('recipe-card', 'A recipe, start to finish', 'recipe', 3,
   '{"ingredients":10,"steps":6,"sketch":true}')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- The bindings.
--
-- Guarded on `worksheet_layout_id IS NULL`, so the seed writes a binding once
-- and never touches it again. A task rebound in the library editor keeps what
-- was chosen there; a task added to a list below lands on the next press.
--
-- Week 4 is not bound task by task. Its sheet is composed rather than packed
-- (§16) — the project type's materials as a checklist, its five steps as
-- check-off lines, and a storyboard for the one planning task — so only the
-- five `-choose` templates carry a binding, and it is what tells the renderer
-- which task the storyboard belongs to.
-- ---------------------------------------------------------------------------

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'lines-4')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'anthem-listen', 'wow-fact', 'how-they-say-it-began', 'whats-in-the-news'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'lines-8')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'kingdom-over-this-place', 'feast-they-keep', 'can-they-worship-freely'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'box-beside')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'flag-draw', 'currency-animal',
  'before-history',
  'life-outdoors', 'who-is-famous',
  'landmark-to-see', 'tonights-dinner'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'split-two')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'language-hello', 'in-their-numbers', 'bible-name-now-name'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'table-3')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'what-people-believe', 'when-it-reached-everybody', 'is-the-law-kept',
  'if-you-break-a-rule-there', 'help-when-money-runs-out'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'timeline')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'war-that-changed', 'who-ruled-before', 'kid-life', 'long-before-people',
  'the-last-hundred-years', 'bible-in-their-tongue'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'figure-anchor')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'how-many-people', 'size-next-to-yours', 'getting-around', 'how-far-away-is-it'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'recipe-card')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'cook-it'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'label-it')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'landforms'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'storyboard')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'story-they-tell',
  'trifold-choose', 'model-choose', 'video-choose', 'skit-choose',
  'museum-choose', 'zine-choose'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'specimen-boxes')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'under-the-ground', 'tree-that-grows', 'craft-of-the-land', 'market-day'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'venn')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'breakfast-there', 'animals-on-the-menu'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'scale-strip')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'highest-point', 'weather-there-now'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'map-marks')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'map-outline', 'river-that-matters'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'bar-graph')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'what-work-pays'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'then-now')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'border-that-moved', 'independence-day', 'desert-shall-blossom',
  'who-was-taken-from-here', 'somebody-elses-museum'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'flow-steps')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'who-leads', 'made-here', 'how-a-law-is-made'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'pictograph')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'city-and-country'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'clock-pair')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'time-there-now'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'list-n')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'neighbors-list', 'game-kids-play'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'week-strip')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'their-rest-day'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'fields')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'oldest-thing-here', 'first-people', 'what-they-grow', 'weather-that-hits',
  'animal-in-trouble', 'sabbath-keepers-there', 'holiday-they-mark',
  'sound-of-the-country'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'box-note')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'national-symbol', 'ancient-site', 'wild-animal', 'wild-place-protected',
  'place-of-worship', 'made-there-first', 'the-first-church-there',
  'what-they-are-working-on'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'label-small')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'house-they-live-in', 'what-they-wear', 'dinosaur-that-lived-here'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'differences')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'law-you-notice', 'who-can-vote', 'girls-and-women', 'the-sport-they-love',
  'who-comes-when-it-burns'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'bullets')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'what-they-plan-next', 'who-speaks-up-there', 'what-they-do-for-you'
);

-- `hundred-people` has no seeded prompt in slice 12's library, so it seeds one
-- here: `who-lives-there`, from LIBRARY_v3.md §2 *Who the people are* (slice
-- 17 owns that subject heading and skips this row). `bullets` bootstrapped
-- the same way with `how-they-learn`, and now carries three prompts of its
-- own (above).
UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'hundred-people')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'who-lives-there'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'bullets')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'how-they-learn'
);

-- Per-template overrides. The knobs a form exposes are the knobs a task is
-- allowed to lean on, and these are the places where the layout's generic
-- default would send a kid to the phone to find out what to draw.
UPDATE task_templates SET worksheet_spec = '{"caption":"Their flag, in their colors","lines":2}'
  WHERE worksheet_spec IS NULL AND slug = 'flag-draw';
UPDATE task_templates SET worksheet_spec = '{"lines":2}'
  WHERE worksheet_spec IS NULL AND slug = 'landmark-to-see';
UPDATE task_templates SET worksheet_spec =
  '{"caption":"People who live there","unit":"people"}'
  WHERE worksheet_spec IS NULL AND slug = 'how-many-people';
UPDATE task_templates SET worksheet_spec =
  '{"caption":"How much land","unit":"square miles","anchor_prompt":"About the same size as…"}'
  WHERE worksheet_spec IS NULL AND slug = 'size-next-to-yours';
UPDATE task_templates SET worksheet_spec =
  '{"caption":"An ordinary trip there","unit":"minutes","anchor_prompt":"Our longest weekly trip is…"}'
  WHERE worksheet_spec IS NULL AND slug = 'getting-around';
UPDATE task_templates SET worksheet_spec =
  '{"columns":["The way they spell it","The way it sounds"],"rows":2}'
  WHERE worksheet_spec IS NULL AND slug = 'language-hello';
UPDATE task_templates SET worksheet_spec =
  '{"columns":["The religion","When it arrived there","A day it keeps"],"rows":3}'
  WHERE worksheet_spec IS NULL AND slug = 'what-people-believe';

UPDATE task_templates SET worksheet_spec = '{"lines":3}'
  WHERE worksheet_spec IS NULL AND slug = 'currency-animal';
UPDATE task_templates SET worksheet_spec = '{"caption":"Still where it was found","lines":3}'
  WHERE worksheet_spec IS NULL AND slug = 'before-history';
UPDATE task_templates SET worksheet_spec = '{"lines":3}'
  WHERE worksheet_spec IS NULL AND slug = 'life-outdoors';
UPDATE task_templates SET worksheet_spec = '{"lines":3}'
  WHERE worksheet_spec IS NULL AND slug = 'who-is-famous';
UPDATE task_templates SET worksheet_spec = '{"lines":3}'
  WHERE worksheet_spec IS NULL AND slug = 'tonights-dinner';

UPDATE task_templates SET worksheet_spec = '{"unit":"clock","ends":["Wake up","Bedtime"]}'
  WHERE worksheet_spec IS NULL AND slug = 'kid-life';
UPDATE task_templates SET worksheet_spec = '{"ticks":3,"ends":["It started","It ended"]}'
  WHERE worksheet_spec IS NULL AND slug = 'war-that-changed';
UPDATE task_templates SET worksheet_spec = '{"ends":["1500","Today"]}'
  WHERE worksheet_spec IS NULL AND slug = 'who-ruled-before';

UPDATE task_templates SET worksheet_spec = '{"caption":"Their story, six panels in order"}'
  WHERE worksheet_spec IS NULL AND slug = 'story-they-tell';

UPDATE task_templates SET worksheet_spec = '{"caption":"What comes out of their ground"}'
  WHERE worksheet_spec IS NULL AND slug = 'under-the-ground';
UPDATE task_templates SET worksheet_spec =
  '{"boxes":3,"caption":"The leaf, the fruit, and what they make"}'
  WHERE worksheet_spec IS NULL AND slug = 'tree-that-grows';
UPDATE task_templates SET worksheet_spec = '{"caption":"The same pattern, four times"}'
  WHERE worksheet_spec IS NULL AND slug = 'craft-of-the-land';
UPDATE task_templates SET worksheet_spec =
  '{"caption":"Four things for sale","circle_one":true}'
  WHERE worksheet_spec IS NULL AND slug = 'market-day';

UPDATE task_templates SET worksheet_spec =
  '{"labels":["Their breakfast","Our breakfast"]}'
  WHERE worksheet_spec IS NULL AND slug = 'breakfast-there';
UPDATE task_templates SET worksheet_spec = '{"labels":["They eat","We eat"]}'
  WHERE worksheet_spec IS NULL AND slug = 'animals-on-the-menu';

UPDATE task_templates SET worksheet_spec =
  '{"marks":3,"unit":"feet above sea level","captions":["Their highest point","Sea level","Their lowest ground"]}'
  WHERE worksheet_spec IS NULL AND slug = 'highest-point';
UPDATE task_templates SET worksheet_spec =
  '{"unit":"°F","captions":["Their weather","Our weather"]}'
  WHERE worksheet_spec IS NULL AND slug = 'weather-there-now';

UPDATE task_templates SET worksheet_spec = '{"caption":"Your country","pins":3}'
  WHERE worksheet_spec IS NULL AND slug = 'map-outline';
UPDATE task_templates SET worksheet_spec = '{"caption":"Their biggest river","pins":3}'
  WHERE worksheet_spec IS NULL AND slug = 'river-that-matters';

UPDATE task_templates SET worksheet_spec =
  '{"orient":"horizontal","bars":3,"axis_label":"What one week of pay buys","caption":"Loaves of bread  ·  Bus rides  ·  Pairs of shoes"}'
  WHERE worksheet_spec IS NULL AND slug = 'what-work-pays';

UPDATE task_templates SET worksheet_spec =
  '{"captions":["Two hundred years ago","Today"],"middle":"Its name, if it changed"}'
  WHERE worksheet_spec IS NULL AND slug = 'border-that-moved';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["Who they belonged to","What they do now"],"middle":"The date"}'
  WHERE worksheet_spec IS NULL AND slug = 'independence-day';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["How it looks now","When the land is healed"]}'
  WHERE worksheet_spec IS NULL AND slug = 'desert-shall-blossom';

UPDATE task_templates SET worksheet_spec = '{"caption":"How a person gets that job"}'
  WHERE worksheet_spec IS NULL AND slug = 'who-leads';
UPDATE task_templates SET worksheet_spec = '{"caption":"From there to here"}'
  WHERE worksheet_spec IS NULL AND slug = 'made-here';

UPDATE task_templates SET worksheet_spec = '{"key":"Each figure = 10 people out of 100"}'
  WHERE worksheet_spec IS NULL AND slug = 'city-and-country';

UPDATE task_templates SET worksheet_spec = '{"items":8}'
  WHERE worksheet_spec IS NULL AND slug = 'neighbors-list';
UPDATE task_templates SET worksheet_spec = '{"items":3}'
  WHERE worksheet_spec IS NULL AND slug = 'game-kids-play';

UPDATE task_templates SET worksheet_spec = '{"caption":"Shade the days most people do not work"}'
  WHERE worksheet_spec IS NULL AND slug = 'their-rest-day';

UPDATE task_templates SET worksheet_spec = '{"caption":"Five things about how kids there learn"}'
  WHERE worksheet_spec IS NULL AND slug = 'how-they-learn';

-- `fields` bindings. Every one sets CAPTIONS — shipped with the layout's
-- empty default the form becomes the new ruled lines inside a month
-- (LIBRARY_v3.md §1).
UPDATE task_templates SET worksheet_spec =
  '{"captions":["What it is","How old it is","Where it was dug up"]}'
  WHERE worksheet_spec IS NULL AND slug = 'oldest-thing-here';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["Who they were","About when they were here","One thing they left behind"]}'
  WHERE worksheet_spec IS NULL AND slug = 'first-people';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["The crop","Where in the country it grows","What they make with it"]}'
  WHERE worksheet_spec IS NULL AND slug = 'what-they-grow';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["What kind of big weather","What time of year it comes","One way people get ready"]}'
  WHERE worksheet_spec IS NULL AND slug = 'weather-that-hits';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["The animal","Why it is disappearing","Roughly how many are left"]}'
  WHERE worksheet_spec IS NULL AND slug = 'animal-in-trouble';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["What they are called there","Roughly how many","When and where they meet"]}'
  WHERE worksheet_spec IS NULL AND slug = 'sabbath-keepers-there';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["The day","What it remembers","What people do"]}'
  WHERE worksheet_spec IS NULL AND slug = 'holiday-they-mark';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["Instrument or style","What it is made of","One word for how it sounds"]}'
  WHERE worksheet_spec IS NULL AND slug = 'sound-of-the-country';

-- `box-note` bindings. Each names what is in the box; the layout's own
-- caption is "Draw it here" and never prints on its own.
UPDATE task_templates SET worksheet_spec = '{"caption":"Their symbol"}'
  WHERE worksheet_spec IS NULL AND slug = 'national-symbol';
UPDATE task_templates SET worksheet_spec = '{"caption":"What is still standing"}'
  WHERE worksheet_spec IS NULL AND slug = 'ancient-site';
UPDATE task_templates SET worksheet_spec = '{"caption":"An animal that lives there and not here"}'
  WHERE worksheet_spec IS NULL AND slug = 'wild-animal';
UPDATE task_templates SET worksheet_spec = '{"caption":"Their biggest wild place"}'
  WHERE worksheet_spec IS NULL AND slug = 'wild-place-protected';
UPDATE task_templates SET worksheet_spec = '{"caption":"Draw the outside"}'
  WHERE worksheet_spec IS NULL AND slug = 'place-of-worship';

-- `label-small` binding. `house-they-live-in` matches the layout's own
-- caption and needs no override.
UPDATE task_templates SET worksheet_spec = '{"caption":"Draw the outfit, then label three parts"}'
  WHERE worksheet_spec IS NULL AND slug = 'what-they-wear';

-- `differences` bindings. `law-you-notice`, `who-can-vote` and
-- `who-comes-when-it-burns` match the layout's own columns and need no
-- override.
UPDATE task_templates SET worksheet_spec = '{"columns":["Girls there","Girls here"]}'
  WHERE worksheet_spec IS NULL AND slug = 'girls-and-women';
UPDATE task_templates SET worksheet_spec = '{"columns":["Their game","A game I play"]}'
  WHERE worksheet_spec IS NULL AND slug = 'the-sport-they-love';

-- Slice 16 overrides. `how-they-say-it-began`, `whats-in-the-news` and
-- `can-they-worship-freely` match their layouts' own defaults and need none.
UPDATE task_templates SET worksheet_spec =
  '{"caption":"Miles from our house to their capital","unit":"miles","anchor_prompt":"That is about … times our longest drive, which was to…"}'
  WHERE worksheet_spec IS NULL AND slug = 'how-far-away-is-it';
UPDATE task_templates SET worksheet_spec =
  '{"columns":["Their unit","What it measures, and how big"]}'
  WHERE worksheet_spec IS NULL AND slug = 'in-their-numbers';
UPDATE task_templates SET worksheet_spec =
  '{"ticks":4,"ends":["200 million years ago","Today"]}'
  WHERE worksheet_spec IS NULL AND slug = 'long-before-people';
UPDATE task_templates SET worksheet_spec =
  '{"caption":"Draw it alive, then label three parts"}'
  WHERE worksheet_spec IS NULL AND slug = 'dinosaur-that-lived-here';
UPDATE task_templates SET worksheet_spec = '{"ends":["A hundred years ago","Today"]}'
  WHERE worksheet_spec IS NULL AND slug = 'the-last-hundred-years';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["Where they were taken from","Where they were taken to"],"middle":"Roughly how many, for how long"}'
  WHERE worksheet_spec IS NULL AND slug = 'who-was-taken-from-here';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["Where it was made","Where it sits now"],"middle":"Who took it, and when"}'
  WHERE worksheet_spec IS NULL AND slug = 'somebody-elses-museum';
UPDATE task_templates SET worksheet_spec =
  '{"columns":["The change","The year there","The year here"],"rows":4}'
  WHERE worksheet_spec IS NULL AND slug = 'when-it-reached-everybody';
UPDATE task_templates SET worksheet_spec = '{"caption":"Made there first"}'
  WHERE worksheet_spec IS NULL AND slug = 'made-there-first';
UPDATE task_templates SET worksheet_spec =
  '{"columns":["The name in Scripture","What it is called now"],"rows":3}'
  WHERE worksheet_spec IS NULL AND slug = 'bible-name-now-name';
UPDATE task_templates SET worksheet_spec = '{"ticks":3,"ends":["First arrived","Today"]}'
  WHERE worksheet_spec IS NULL AND slug = 'bible-in-their-tongue';
UPDATE task_templates SET worksheet_spec = '{"caption":"The oldest one still standing"}'
  WHERE worksheet_spec IS NULL AND slug = 'the-first-church-there';
UPDATE task_templates SET worksheet_spec = '{"caption":"From an idea to a law"}'
  WHERE worksheet_spec IS NULL AND slug = 'how-a-law-is-made';
UPDATE task_templates SET worksheet_spec =
  '{"columns":["What the law says","What actually happens","How you know"],"rows":3}'
  WHERE worksheet_spec IS NULL AND slug = 'is-the-law-kept';
UPDATE task_templates SET worksheet_spec =
  '{"columns":["What is against the law","What happens to you","Who decides"],"rows":3}'
  WHERE worksheet_spec IS NULL AND slug = 'if-you-break-a-rule-there';
UPDATE task_templates SET worksheet_spec =
  '{"caption":"Five things this country says it is trying to do"}'
  WHERE worksheet_spec IS NULL AND slug = 'what-they-plan-next';
UPDATE task_templates SET worksheet_spec =
  '{"items":4,"caption":"Four things this group is asking for"}'
  WHERE worksheet_spec IS NULL AND slug = 'who-speaks-up-there';
UPDATE task_templates SET worksheet_spec =
  '{"caption":"Five things a family there can count on"}'
  WHERE worksheet_spec IS NULL AND slug = 'what-they-do-for-you';
UPDATE task_templates SET worksheet_spec =
  '{"columns":["The help","Who can get it","Who pays for it"],"rows":3}'
  WHERE worksheet_spec IS NULL AND slug = 'help-when-money-runs-out';
UPDATE task_templates SET worksheet_spec =
  '{"caption":"What they are building or studying"}'
  WHERE worksheet_spec IS NULL AND slug = 'what-they-are-working-on';
