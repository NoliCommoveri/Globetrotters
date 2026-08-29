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
-- `list-n`, `bullets`, `week-strip` — and four slice 14 adds: `fields`,
-- `box-note`, `label-small`, `differences`. `box-caption` retires in slice 14:
-- its six prompts move to `box-note` and (for `map-outline`) `map-marks`
-- (LIBRARY_v3.md §1).
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
  ('compare', 'There and here', 'split', 2,
   '{"columns":["There","Here"],"rows":6,"shared":0}'),
  ('table-3', 'Three-column table', 'table', 2,
   '{"columns":["What","Where","Why it matters"],"rows":6}'),
  ('timeline', 'Dates on a line', 'timeline', 1,
   '{"ticks":5}'),
  ('figures', 'Numbers to find', 'figures', 1,
   '{"boxes":3,"captions":["How many","How big","One more number"]}'),
  ('label-it', 'One big sketch with callouts', 'box', 3,
   '{"caption":"Draw it big, then label the parts","lines":0,"callouts":6,"below":false}'),
  ('checklist', 'Check-off list', 'checklist', 1,
   '{"items":8,"labels":[],"marker":"box","circle_one":false,"orient":"list","caption":""}'),
  ('storyboard', 'Six-panel storyboard', 'storyboard', 2,
   '{"panels":6}'),
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
   '{"items":7,"labels":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"marker":"box","circle_one":false,"orient":"across","caption":""}')
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
  'anthem-listen',
  'feast-they-keep', 'wow-fact', 'tonights-dinner', 'getting-around'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'lines-8')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'kingdom-over-this-place', 'what-people-believe'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'box-beside')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'flag-draw', 'currency-animal',
  'before-history',
  'life-outdoors', 'who-is-famous',
  'landmark-to-see'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'split-two')
WHERE worksheet_layout_id IS NULL AND slug IN ('language-hello');

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'compare')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'size-next-to-yours'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'timeline')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'war-that-changed', 'who-ruled-before', 'kid-life'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'figures')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'how-many-people'
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
  'border-that-moved', 'independence-day', 'desert-shall-blossom'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'flow-steps')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'who-leads', 'made-here'
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
  'place-of-worship'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'label-small')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'house-they-live-in', 'what-they-wear'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'differences')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'law-you-notice', 'who-can-vote', 'girls-and-women', 'the-sport-they-love'
);

-- `hundred-people` and `bullets` have no seeded prompt in slice 12's library,
-- so each seeds one here: `who-lives-there` and `how-they-learn`, both from
-- LIBRARY_v3.md §2 *Who the people are* (slice 17 owns that subject heading
-- and skips these two rows).
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
UPDATE task_templates SET worksheet_spec = '{"caption":"Their flag, in their colors"}'
  WHERE worksheet_spec IS NULL AND slug = 'flag-draw';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["People","Square miles","One more number"]}'
  WHERE worksheet_spec IS NULL AND slug = 'how-many-people';
UPDATE task_templates SET worksheet_spec = '{"columns":["Hello","How it sounds"]}'
  WHERE worksheet_spec IS NULL AND slug = 'language-hello';

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

-- `differences` bindings. `law-you-notice` and `who-can-vote` match the
-- layout's own columns and need no override.
UPDATE task_templates SET worksheet_spec = '{"columns":["Girls there","Girls here"]}'
  WHERE worksheet_spec IS NULL AND slug = 'girls-and-women';
UPDATE task_templates SET worksheet_spec = '{"columns":["Their game","A game I play"]}'
  WHERE worksheet_spec IS NULL AND slug = 'the-sport-they-love';
