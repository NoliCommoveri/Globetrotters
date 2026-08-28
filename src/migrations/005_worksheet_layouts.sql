-- 005_worksheet_layouts.sql — the twelve printed forms, and which task wants
-- which one (DESIGN.md §16, §13).
--
-- A seed, not a migration: Run seed re-executes it on every press, every insert
-- is ON CONFLICT DO NOTHING, and every binding is guarded on the column still
-- being empty. A layout retuned in the library editor and a binding changed
-- there both survive every future press, which is the whole point of there
-- being twelve forms rather than ninety worksheets.
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
-- The twelve forms.
-- ---------------------------------------------------------------------------
INSERT INTO worksheet_layouts (slug, name, kind, height_thirds, spec) VALUES
  ('lines-4', 'Four ruled lines', 'lines', 1,
   '{"lines":4}'),
  ('lines-8', 'Eight ruled lines', 'lines', 2,
   '{"lines":8}'),
  ('box-caption', 'Drawing box with caption', 'box', 2,
   '{"caption":"Draw it here","lines":0,"callouts":0}'),
  ('box-beside', 'Small box with notes beside it', 'box', 1,
   '{"caption":"Sketch it","lines":4,"callouts":0}'),
  ('split-two', 'Two labelled columns', 'split', 1,
   '{"columns":["Their word","How it sounds"],"rows":4}'),
  ('compare', 'There and here', 'split', 2,
   '{"columns":["There","Here"],"rows":6}'),
  ('table-3', 'Three-column table', 'table', 2,
   '{"columns":["What","Where","Why it matters"],"rows":6}'),
  ('timeline', 'Dates on a line', 'timeline', 1,
   '{"ticks":5}'),
  ('figures', 'Numbers to find', 'figures', 1,
   '{"boxes":3,"captions":["How many","How big","One more number"]}'),
  ('label-it', 'One big sketch with callouts', 'box', 3,
   '{"caption":"Draw it big, then label the parts","lines":0,"callouts":6}'),
  ('checklist', 'Check-off list', 'checklist', 1,
   '{"items":8,"labels":[]}'),
  ('storyboard', 'Six-panel storyboard', 'storyboard', 2,
   '{"panels":6}')
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
  'neighbors-list', 'anthem-listen', 'time-there-now',
  'weather-that-hits', 'law-you-notice', 'who-can-vote', 'first-people',
  'desert-shall-blossom', 'border-that-moved', 'what-they-grow',
  'feast-they-keep', 'holiday-they-mark', 'sabbath-keepers-there',
  'sound-of-the-country', 'wow-fact', 'tonights-dinner', 'getting-around',
  'their-rest-day', 'girls-and-women', 'game-kids-play', 'animals-on-the-menu'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'lines-8')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'kingdom-over-this-place', 'what-people-believe'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'box-caption')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'map-outline', 'national-symbol',
  'wild-animal', 'ancient-site',
  'place-of-worship', 'house-they-live-in'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'box-beside')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'flag-draw', 'currency-animal', 'river-that-matters',
  'animal-in-trouble', 'tree-that-grows', 'wild-place-protected', 'who-leads',
  'made-here', 'before-history', 'oldest-thing-here',
  'the-sport-they-love', 'breakfast-there', 'life-outdoors', 'who-is-famous',
  'landmark-to-see', 'what-they-wear', 'craft-of-the-land'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'split-two')
WHERE worksheet_layout_id IS NULL AND slug IN ('language-hello');

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'compare')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'size-next-to-yours', 'city-and-country'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'table-3')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'under-the-ground', 'market-day'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'timeline')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'independence-day', 'war-that-changed', 'who-ruled-before', 'kid-life'
);

UPDATE task_templates SET worksheet_layout_id =
  (SELECT id FROM worksheet_layouts WHERE slug = 'figures')
WHERE worksheet_layout_id IS NULL AND slug IN (
  'how-many-people', 'weather-there-now', 'highest-point'
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

-- Per-template overrides. The knobs a form exposes are the knobs a task is
-- allowed to lean on, and these are the four places where the generic caption
-- would send a kid to the phone to find out what to draw.
UPDATE task_templates SET worksheet_spec = '{"caption":"Their flag, in their colors"}'
  WHERE worksheet_spec IS NULL AND slug = 'flag-draw';
UPDATE task_templates SET worksheet_spec = '{"caption":"The outline, with the capital starred"}'
  WHERE worksheet_spec IS NULL AND slug = 'map-outline';
UPDATE task_templates SET worksheet_spec =
  '{"captions":["People","Square miles","One more number"]}'
  WHERE worksheet_spec IS NULL AND slug = 'how-many-people';
UPDATE task_templates SET worksheet_spec = '{"columns":["Hello","How it sounds"]}'
  WHERE worksheet_spec IS NULL AND slug = 'language-hello';
