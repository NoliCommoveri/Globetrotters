-- 002_seed.sql — the library, and the three people.
--
-- Append-only like every migration, with one extra rule of its own: every
-- insert here is ON CONFLICT DO NOTHING, so this file is also safe to re-run
-- from Run seed on /admin. Once a row exists the seed never touches it again —
-- a title corrected in the library editor survives every future seed run.
--
-- That cuts both ways. Correcting a row that has already been seeded means a
-- new migration file or the editor. Editing this file after it has been applied
-- changes nothing in the database and shows up on /admin as drift.
--
-- The conflict key is the slug (iso3 for countries), never the id: ids are
-- assigned by SQLite and a row the editor created must not collide with one
-- this file inserts later.

-- ---------------------------------------------------------------------------
-- People (Q-04). Three placeholder rows, renamed on /admin.
--
-- A person row has to exist before anyone can pick themselves at first run, so
-- the seed writes three and the editor renames them. Ids are explicit here and
-- only here, because `people` has no natural key to conflict on — the id is the
-- key, and re-running the seed must not mint a fourth Person 1.
--
-- The three inks (D-09) are one deep purple, one lilac, one blue: distinct in
-- hue on screen and ~26% / ~61% / ~41% grey on a home printer, which is what
-- keeps three stamps apart when the passport is photocopied. Editable on
-- /admin.
-- ---------------------------------------------------------------------------
INSERT INTO people (id, name, color, sort_order, created_at) VALUES
  (1, 'Person 1', '#5B2A86', 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  (2, 'Person 2', '#D07AC0', 2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  (3, 'Person 3', '#2E6FD9', 3, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Focuses (§4). Six, fixed. The blurb is what the setup screen shows under the
-- name, so it is written to a 5th grader and says what the month will feel
-- like, not what the category is called.
-- ---------------------------------------------------------------------------
INSERT INTO focuses (slug, name, blurb) VALUES
  ('ancient-world', 'Ancient World',
   'Who was here first, what they built, and what is still standing.'),
  ('wild-places', 'Wild Places',
   'The animals, the weather, and the parts of the map nobody lives on.'),
  ('people-and-power', 'People and Power',
   'Who decides things, how they got the job, and what everyone else thinks about it.'),
  ('food-and-craft', 'Food and Craft',
   'What is for dinner, what is made by hand, and how both got that way.'),
  ('conflict-and-change', 'Conflict and Change',
   'The moments the country was one thing on Monday and another by Friday.'),
  ('land-and-sky', 'Land and Sky',
   'Mountains, rivers, volcanoes, seasons — the ground itself and what it does.')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Project types (§4). Six, fixed. `materials` is the freeform "what you'll
-- need" the week-4 gather task points at.
--
-- Only trifold-board carries week-4 templates in seed v0. The other five are
-- real rows with an empty sequence, and setup hides a project type with no
-- week-4 templates rather than offering a month that ends in five blank cards.
-- ---------------------------------------------------------------------------
INSERT INTO project_types (slug, name, materials) VALUES
  ('trifold-board', 'Trifold board',
   'A trifold display board, glue stick, scissors, printed pictures, markers.'),
  ('model-or-diorama', 'Model or diorama',
   'A shoebox or a base board, cardboard, paint, clay, whatever is in the craft drawer.'),
  ('video', 'Video',
   'A phone or tablet that records, somewhere quiet, and a plan written down first.'),
  ('skit', 'Skit',
   'A script on paper, whatever counts as a costume, and one person willing to watch.'),
  ('museum-box', 'Museum box',
   'A box, small objects or made ones, and a hand-written label for each.'),
  ('illustrated-zine', 'Illustrated zine',
   'Paper folded into pages, a pen you like, and a title for the cover.')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Countries — 195 rows. Name, ISO 3166-1 alpha-3, continent, region, and
-- research_depth: 1 lots to find, 2 some digging, 3 you'll have to hunt.
--
-- research_depth is the adventure level, and it is the column that prevents the
-- worst month of the year — twenty tasks on a country with almost nothing
-- findable in English at a 5th grade reading level (§9).
--
-- The conflict key is iso3, so a name can be corrected later without minting a
-- second row for the same country.
--
-- Unadorned on purpose: hooks, focus affinities and any revision to
-- research_depth are 003_country_data.sql, slice 09.
-- ---------------------------------------------------------------------------
INSERT INTO countries (name, iso3, continent, region, research_depth) VALUES
  ('Algeria', 'DZA', 'Africa', 'North Africa', 1),
  ('Angola', 'AGO', 'Africa', 'Central Africa', 2),
  ('Benin', 'BEN', 'Africa', 'West Africa', 3),
  ('Botswana', 'BWA', 'Africa', 'Southern Africa', 2),
  ('Burkina Faso', 'BFA', 'Africa', 'West Africa', 3),
  ('Burundi', 'BDI', 'Africa', 'East Africa', 3),
  ('Cape Verde', 'CPV', 'Africa', 'West Africa', 3),
  ('Cameroon', 'CMR', 'Africa', 'Central Africa', 2),
  ('Central African Republic', 'CAF', 'Africa', 'Central Africa', 3),
  ('Chad', 'TCD', 'Africa', 'Central Africa', 3),
  ('Comoros', 'COM', 'Africa', 'East Africa', 3),
  ('Congo', 'COG', 'Africa', 'Central Africa', 3),
  ('Democratic Republic of Congo', 'COD', 'Africa', 'Central Africa', 2),
  ('Côte d''Ivoire', 'CIV', 'Africa', 'West Africa', 2),
  ('Djibouti', 'DJI', 'Africa', 'East Africa', 3),
  ('Egypt', 'EGY', 'Africa', 'North Africa', 1),
  ('Equatorial Guinea', 'GNQ', 'Africa', 'Central Africa', 3),
  ('Eritrea', 'ERI', 'Africa', 'East Africa', 3),
  ('Eswatini', 'SWZ', 'Africa', 'Southern Africa', 3),
  ('Ethiopia', 'ETH', 'Africa', 'East Africa', 1),
  ('Gabon', 'GAB', 'Africa', 'Central Africa', 3),
  ('Gambia', 'GMB', 'Africa', 'West Africa', 3),
  ('Ghana', 'GHA', 'Africa', 'West Africa', 1),
  ('Guinea', 'GIN', 'Africa', 'West Africa', 3),
  ('Guinea-Bissau', 'GNB', 'Africa', 'West Africa', 3),
  ('Kenya', 'KEN', 'Africa', 'East Africa', 1),
  ('Lesotho', 'LSO', 'Africa', 'Southern Africa', 3),
  ('Liberia', 'LBR', 'Africa', 'West Africa', 2),
  ('Libya', 'LBY', 'Africa', 'North Africa', 2),
  ('Madagascar', 'MDG', 'Africa', 'East Africa', 1),
  ('Malawi', 'MWI', 'Africa', 'East Africa', 2),
  ('Mali', 'MLI', 'Africa', 'West Africa', 2),
  ('Mauritania', 'MRT', 'Africa', 'West Africa', 3),
  ('Mauritius', 'MUS', 'Africa', 'East Africa', 2),
  ('Morocco', 'MAR', 'Africa', 'North Africa', 1),
  ('Mozambique', 'MOZ', 'Africa', 'East Africa', 2),
  ('Namibia', 'NAM', 'Africa', 'Southern Africa', 1),
  ('Niger', 'NER', 'Africa', 'West Africa', 3),
  ('Nigeria', 'NGA', 'Africa', 'West Africa', 1),
  ('Rwanda', 'RWA', 'Africa', 'East Africa', 1),
  ('Sao Tome and Principe', 'STP', 'Africa', 'Central Africa', 3),
  ('Senegal', 'SEN', 'Africa', 'West Africa', 2),
  ('Seychelles', 'SYC', 'Africa', 'East Africa', 2),
  ('Sierra Leone', 'SLE', 'Africa', 'West Africa', 2),
  ('Somalia', 'SOM', 'Africa', 'East Africa', 2),
  ('South Africa', 'ZAF', 'Africa', 'Southern Africa', 1),
  ('South Sudan', 'SSD', 'Africa', 'East Africa', 3),
  ('Sudan', 'SDN', 'Africa', 'North Africa', 2),
  ('Tanzania', 'TZA', 'Africa', 'East Africa', 1),
  ('Togo', 'TGO', 'Africa', 'West Africa', 3),
  ('Tunisia', 'TUN', 'Africa', 'North Africa', 1),
  ('Uganda', 'UGA', 'Africa', 'East Africa', 1),
  ('Zambia', 'ZMB', 'Africa', 'Southern Africa', 2),
  ('Zimbabwe', 'ZWE', 'Africa', 'Southern Africa', 1),
  ('Afghanistan', 'AFG', 'Asia', 'South Asia', 1),
  ('Armenia', 'ARM', 'Asia', 'Caucasus', 2),
  ('Azerbaijan', 'AZE', 'Asia', 'Caucasus', 2),
  ('Bahrain', 'BHR', 'Asia', 'Middle East', 2),
  ('Bangladesh', 'BGD', 'Asia', 'South Asia', 1),
  ('Bhutan', 'BTN', 'Asia', 'South Asia', 2),
  ('Brunei', 'BRN', 'Asia', 'Southeast Asia', 3),
  ('Cambodia', 'KHM', 'Asia', 'Southeast Asia', 1),
  ('China', 'CHN', 'Asia', 'East Asia', 1),
  ('Cyprus', 'CYP', 'Asia', 'Middle East', 2),
  ('Georgia', 'GEO', 'Asia', 'Caucasus', 2),
  ('India', 'IND', 'Asia', 'South Asia', 1),
  ('Indonesia', 'IDN', 'Asia', 'Southeast Asia', 1),
  ('Iran', 'IRN', 'Asia', 'Middle East', 1),
  ('Iraq', 'IRQ', 'Asia', 'Middle East', 1),
  ('Israel', 'ISR', 'Asia', 'Middle East', 1),
  ('Japan', 'JPN', 'Asia', 'East Asia', 1),
  ('Jordan', 'JOR', 'Asia', 'Middle East', 1),
  ('Kazakhstan', 'KAZ', 'Asia', 'Central Asia', 2),
  ('Kuwait', 'KWT', 'Asia', 'Middle East', 2),
  ('Kyrgyzstan', 'KGZ', 'Asia', 'Central Asia', 3),
  ('Laos', 'LAO', 'Asia', 'Southeast Asia', 2),
  ('Lebanon', 'LBN', 'Asia', 'Middle East', 1),
  ('Malaysia', 'MYS', 'Asia', 'Southeast Asia', 1),
  ('Maldives', 'MDV', 'Asia', 'South Asia', 2),
  ('Mongolia', 'MNG', 'Asia', 'East Asia', 1),
  ('Myanmar', 'MMR', 'Asia', 'Southeast Asia', 1),
  ('Nepal', 'NPL', 'Asia', 'South Asia', 1),
  ('North Korea', 'PRK', 'Asia', 'East Asia', 1),
  ('Oman', 'OMN', 'Asia', 'Middle East', 2),
  ('Pakistan', 'PAK', 'Asia', 'South Asia', 1),
  ('Palestine', 'PSE', 'Asia', 'Middle East', 1),
  ('Philippines', 'PHL', 'Asia', 'Southeast Asia', 1),
  ('Qatar', 'QAT', 'Asia', 'Middle East', 1),
  ('Saudi Arabia', 'SAU', 'Asia', 'Middle East', 1),
  ('Singapore', 'SGP', 'Asia', 'Southeast Asia', 1),
  ('South Korea', 'KOR', 'Asia', 'East Asia', 1),
  ('Sri Lanka', 'LKA', 'Asia', 'South Asia', 1),
  ('Syria', 'SYR', 'Asia', 'Middle East', 1),
  ('Tajikistan', 'TJK', 'Asia', 'Central Asia', 3),
  ('Thailand', 'THA', 'Asia', 'Southeast Asia', 1),
  ('East Timor', 'TLS', 'Asia', 'Southeast Asia', 3),
  ('Turkey', 'TUR', 'Asia', 'Middle East', 1),
  ('Turkmenistan', 'TKM', 'Asia', 'Central Asia', 3),
  ('United Arab Emirates', 'ARE', 'Asia', 'Middle East', 1),
  ('Uzbekistan', 'UZB', 'Asia', 'Central Asia', 2),
  ('Vietnam', 'VNM', 'Asia', 'Southeast Asia', 1),
  ('Yemen', 'YEM', 'Asia', 'Middle East', 2),
  ('Albania', 'ALB', 'Europe', 'Southern Europe', 2),
  ('Andorra', 'AND', 'Europe', 'Southern Europe', 3),
  ('Austria', 'AUT', 'Europe', 'Western Europe', 1),
  ('Belarus', 'BLR', 'Europe', 'Eastern Europe', 2),
  ('Belgium', 'BEL', 'Europe', 'Western Europe', 1),
  ('Bosnia and Herzegovina', 'BIH', 'Europe', 'Southern Europe', 2),
  ('Bulgaria', 'BGR', 'Europe', 'Eastern Europe', 2),
  ('Croatia', 'HRV', 'Europe', 'Southern Europe', 1),
  ('Czech Republic', 'CZE', 'Europe', 'Eastern Europe', 1),
  ('Denmark', 'DNK', 'Europe', 'Northern Europe', 1),
  ('Estonia', 'EST', 'Europe', 'Northern Europe', 2),
  ('Finland', 'FIN', 'Europe', 'Northern Europe', 1),
  ('France', 'FRA', 'Europe', 'Western Europe', 1),
  ('Germany', 'DEU', 'Europe', 'Western Europe', 1),
  ('Greece', 'GRC', 'Europe', 'Southern Europe', 1),
  ('Hungary', 'HUN', 'Europe', 'Eastern Europe', 1),
  ('Iceland', 'ISL', 'Europe', 'Northern Europe', 1),
  ('Ireland', 'IRL', 'Europe', 'Northern Europe', 1),
  ('Italy', 'ITA', 'Europe', 'Southern Europe', 1),
  ('Latvia', 'LVA', 'Europe', 'Northern Europe', 2),
  ('Liechtenstein', 'LIE', 'Europe', 'Western Europe', 3),
  ('Lithuania', 'LTU', 'Europe', 'Northern Europe', 2),
  ('Luxembourg', 'LUX', 'Europe', 'Western Europe', 2),
  ('Malta', 'MLT', 'Europe', 'Southern Europe', 2),
  ('Moldova', 'MDA', 'Europe', 'Eastern Europe', 3),
  ('Monaco', 'MCO', 'Europe', 'Western Europe', 3),
  ('Montenegro', 'MNE', 'Europe', 'Southern Europe', 3),
  ('Netherlands', 'NLD', 'Europe', 'Western Europe', 1),
  ('North Macedonia', 'MKD', 'Europe', 'Southern Europe', 3),
  ('Norway', 'NOR', 'Europe', 'Northern Europe', 1),
  ('Poland', 'POL', 'Europe', 'Eastern Europe', 1),
  ('Portugal', 'PRT', 'Europe', 'Southern Europe', 1),
  ('Romania', 'ROU', 'Europe', 'Eastern Europe', 1),
  ('Russia', 'RUS', 'Europe', 'Eastern Europe', 1),
  ('San Marino', 'SMR', 'Europe', 'Southern Europe', 3),
  ('Serbia', 'SRB', 'Europe', 'Southern Europe', 2),
  ('Slovakia', 'SVK', 'Europe', 'Eastern Europe', 2),
  ('Slovenia', 'SVN', 'Europe', 'Southern Europe', 2),
  ('Spain', 'ESP', 'Europe', 'Southern Europe', 1),
  ('Sweden', 'SWE', 'Europe', 'Northern Europe', 1),
  ('Switzerland', 'CHE', 'Europe', 'Western Europe', 1),
  ('Ukraine', 'UKR', 'Europe', 'Eastern Europe', 1),
  ('United Kingdom', 'GBR', 'Europe', 'Northern Europe', 1),
  ('Vatican City', 'VAT', 'Europe', 'Southern Europe', 2),
  ('Antigua and Barbuda', 'ATG', 'North America', 'Caribbean', 3),
  ('Bahamas', 'BHS', 'North America', 'Caribbean', 2),
  ('Barbados', 'BRB', 'North America', 'Caribbean', 2),
  ('Belize', 'BLZ', 'North America', 'Central America', 2),
  ('Canada', 'CAN', 'North America', 'North America', 1),
  ('Costa Rica', 'CRI', 'North America', 'Central America', 1),
  ('Cuba', 'CUB', 'North America', 'Caribbean', 1),
  ('Dominica', 'DMA', 'North America', 'Caribbean', 3),
  ('Dominican Republic', 'DOM', 'North America', 'Caribbean', 1),
  ('El Salvador', 'SLV', 'North America', 'Central America', 2),
  ('Grenada', 'GRD', 'North America', 'Caribbean', 3),
  ('Guatemala', 'GTM', 'North America', 'Central America', 1),
  ('Haiti', 'HTI', 'North America', 'Caribbean', 1),
  ('Honduras', 'HND', 'North America', 'Central America', 2),
  ('Jamaica', 'JAM', 'North America', 'Caribbean', 1),
  ('Mexico', 'MEX', 'North America', 'North America', 1),
  ('Nicaragua', 'NIC', 'North America', 'Central America', 2),
  ('Panama', 'PAN', 'North America', 'Central America', 1),
  ('Saint Kitts and Nevis', 'KNA', 'North America', 'Caribbean', 3),
  ('Saint Lucia', 'LCA', 'North America', 'Caribbean', 3),
  ('Saint Vincent and the Grenadines', 'VCT', 'North America', 'Caribbean', 3),
  ('Trinidad and Tobago', 'TTO', 'North America', 'Caribbean', 2),
  ('United States', 'USA', 'North America', 'North America', 1),
  ('Argentina', 'ARG', 'South America', 'Southern Cone', 1),
  ('Bolivia', 'BOL', 'South America', 'Andean', 2),
  ('Brazil', 'BRA', 'South America', 'Brazil', 1),
  ('Chile', 'CHL', 'South America', 'Southern Cone', 1),
  ('Colombia', 'COL', 'South America', 'Andean', 1),
  ('Ecuador', 'ECU', 'South America', 'Andean', 2),
  ('Guyana', 'GUY', 'South America', 'Caribbean South America', 3),
  ('Paraguay', 'PRY', 'South America', 'Southern Cone', 2),
  ('Peru', 'PER', 'South America', 'Andean', 1),
  ('Suriname', 'SUR', 'South America', 'Caribbean South America', 3),
  ('Uruguay', 'URY', 'South America', 'Southern Cone', 2),
  ('Venezuela', 'VEN', 'South America', 'Caribbean South America', 2),
  ('Australia', 'AUS', 'Oceania', 'Australia and New Zealand', 1),
  ('Fiji', 'FJI', 'Oceania', 'Melanesia', 2),
  ('Kiribati', 'KIR', 'Oceania', 'Micronesia', 3),
  ('Marshall Islands', 'MHL', 'Oceania', 'Micronesia', 3),
  ('Micronesia', 'FSM', 'Oceania', 'Micronesia', 3),
  ('Nauru', 'NRU', 'Oceania', 'Micronesia', 3),
  ('New Zealand', 'NZL', 'Oceania', 'Australia and New Zealand', 1),
  ('Palau', 'PLW', 'Oceania', 'Micronesia', 3),
  ('Papua New Guinea', 'PNG', 'Oceania', 'Melanesia', 2),
  ('Samoa', 'WSM', 'Oceania', 'Polynesia', 3),
  ('Solomon Islands', 'SLB', 'Oceania', 'Melanesia', 3),
  ('Tonga', 'TON', 'Oceania', 'Polynesia', 3),
  ('Tuvalu', 'TUV', 'Oceania', 'Polynesia', 3),
  ('Vanuatu', 'VUT', 'Oceania', 'Melanesia', 3)
ON CONFLICT (iso3) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Task templates — 37 rows. 6 in week 1 (4 core + 2 competing for the fifth
-- slot), 13 in week 2, 13 in week 3, 5 in week 4 for trifold-board only.
--
-- Not the twenty in §14: a 5-template week draws all of itself, which leaves
-- Swap with no candidate, and one project type's week 4 is 5 rows on its own.
-- That floor is 27, and it sizes the pool for the draw and nothing else.
--
-- Thirteen is what the focuses need rather than what the draw needs. Five
-- tasks are drawn a week whatever the pool holds, so depth costs the kid
-- nothing; a focus with two on-theme tasks, though, draws both of them every
-- month it is chosen, and these are picked nine times each. Three on-theme
-- tasks per focus per week is the floor, and thirteen is what it takes to
-- give all six of them that in both weeks.
--
-- Tier says what is drawn, not how hard it is. `core` is fixed and always
-- included — week 1's four and all five week-4 rows. `focus` is the
-- focus-weighted pool, weeks 2 and 3. `wild` is week 1's fifth-slot candidates.
--
-- The project type is named by slug and resolved by the LEFT JOIN, so these
-- rows do not depend on an id this file cannot know. A row with NULL there gets
-- NULL, which is every row outside week 4.
--
-- The header row names the columns and selects nothing: SQLite has no
-- `AS v(a, b, c)` syntax, and without names the join would have to reach for
-- `column1`. WHERE true is required before ON CONFLICT on an INSERT ... SELECT,
-- or the parser reads ON as the start of another join constraint.
-- ---------------------------------------------------------------------------
INSERT INTO task_templates
  (slug, title, prompt, week_theme, workbook_page, tier, project_type_id, position)
SELECT v.slug, v.title, v.prompt, v.week_theme, v.workbook_page, v.tier, p.id, v.position
FROM (
  SELECT NULL AS slug, NULL AS title, NULL AS prompt, NULL AS week_theme,
         NULL AS workbook_page, NULL AS tier, NULL AS project_type, NULL AS position
  WHERE 0
  UNION ALL VALUES
-- BEGIN task_templates
  ('flag-draw', 'Draw and color the flag',
   'Find your country''s flag and copy it into your workbook. Get the colors right, then write one line about what you think the colors are for.',
   1, 'flag', 'core', NULL, NULL),

  ('map-outline', 'Trace the map and capital',
   'Find a map of your country and trace its outline into your workbook. Mark a star where the capital city is and write its name next to it.',
   1, 'map', 'core', NULL, NULL),

  ('neighbors-list', 'Find who your country borders',
   'Look at the map and list every country that shares a border with yours. If it''s an island with no land borders, write that instead.',
   1, 'map', 'core', NULL, NULL),

  ('language-hello', 'Say hello and write it',
   'Find out what language people speak there and how to say "hello." Write it in your workbook twice: once copied the way they spell it, and once the way it sounds out loud.',
   1, 'language', 'core', NULL, NULL),

  ('currency-animal', 'What is on their money?',
   'Find a picture of their money. Which animal, plant or person is on it? Draw it, and write who they are.',
   1, 'money', 'wild', NULL, NULL),

  ('national-symbol', 'Draw the national symbol',
   'Find the country''s coat of arms, national animal, or national flower. Draw it and write one sentence about why you think it was chosen.',
   1, 'symbols', 'wild', NULL, NULL),
  ('how-many-people', 'How many people live there?',
   'Find out how many people live in your country. Write the number down, then find a US state with about the same number so you know what it feels like.',
   1, 'people', 'wild', NULL, NULL),

  ('time-there-now', 'Find out what time it is there',
   'Work out what time it is in their capital right now. Write it next to your own time, and write one sentence about what people there are probably doing.',
   1, 'map', 'wild', NULL, NULL),

  ('size-next-to-yours', 'How big is it really?',
   'Find out how much land the country covers. Then find a state or a country you already know that is about the same size, and write the comparison down.',
   1, 'map', 'wild', NULL, NULL),

  ('anthem-listen', 'Listen to their anthem',
   'Find their national anthem and listen to the first thirty seconds. Write one word for how it sounds, and one line about what it is asking for.',
   1, 'symbols', 'wild', NULL, NULL),

  ('first-people', 'Find the first known people',
   'Find out who the earliest known people living in this land were and about when they were there. Write two sentences about them.',
   2, 'history', 'focus', NULL, NULL),

  ('ancient-site', 'Find an ancient site',
   'Find one ancient building, ruin, or site in this country that is hundreds or thousands of years old. Draw it and write how old it is.',
   2, 'history', 'focus', NULL, NULL),

  ('who-leads', 'Find out who leads the country',
   'Find out how this country chooses its leader and what that person is called. Write one sentence about how they got the job.',
   2, 'government', 'focus', NULL, NULL),

  ('law-you-notice', 'Find a surprising law',
   'Find one law or rule in this country that is different from where you live. Write what it is and why you think it exists.',
   2, 'government', 'focus', NULL, NULL),

  ('landforms', 'Describe the land',
   'Look at the land: mountains, desert, coastline, or plains. Pick the one word that describes most of it and draw a small sketch.',
   2, 'land', 'focus', NULL, NULL),

  ('weather-there-now', 'Check the weather there today',
   'Look up the weather in the capital city right now. Write the temperature and compare it to your own weather today.',
   2, 'climate', 'focus', NULL, NULL),

  ('wild-animal', 'Draw a wild animal',
   'Find one wild animal that lives in this country and nowhere else nearby. Draw it and write one fact about where it lives.',
   2, 'ecology', 'focus', NULL, NULL),

  ('animal-in-trouble', 'Find an animal in trouble',
   'Find one animal from this country that scientists say is endangered. Write down one reason it is disappearing, and how many are left if you can find a number.',
   2, 'ecology', 'focus', NULL, NULL),

  ('wild-place-protected', 'Find their biggest wild place',
   'Find the biggest national park or nature reserve in this country. Write down its name and one animal that is safer because that place is protected.',
   2, 'ecology', 'focus', NULL, NULL),

  ('what-they-grow', 'Find out what they grow',
   'Find the crop this country grows the most of. Write down what it is, and one thing people there make or cook with it.',
   2, 'land', 'focus', NULL, NULL),

  ('made-here', 'Find something made there',
   'Find one thing this country makes and sells to the rest of the world. Write down what it is, then check your own house for anything made there.',
   2, 'money', 'focus', NULL, NULL),

  ('border-that-moved', 'Find a border that moved',
   'Find out whether this country''s borders or its name have changed in the last two hundred years. Write down what changed, or write that nothing did.',
   2, 'history', 'focus', NULL, NULL),

  ('before-history', 'Find something from before writing',
   'Find one fossil, cave painting, or prehistoric find from this country. Draw it and write how long ago it was made.',
   2, 'prehistory', 'focus', NULL, NULL),
  ('who-ruled-before', 'Find out who ruled before',
   'Find out who was in charge of this land five hundred years ago — a king, an empire, a set of villages that ran themselves. Write two sentences about them.',
   2, 'history', 'focus', NULL, NULL),

  ('independence-day', 'Find the day they became a country',
   'Find out when this country started ruling itself, and who it belonged to before that. Write the date down and draw one thing people do to celebrate it.',
   2, 'history', 'focus', NULL, NULL),

  ('war-that-changed', 'Find a fight that changed things',
   'Find one war or uprising that changed this country. Write down who was fighting, and one thing that was different afterwards.',
   2, 'history', 'focus', NULL, NULL),

  ('who-can-vote', 'Find out who gets a say',
   'Find out who is allowed to vote there and how old you have to be. Write down one way that is different from where you live.',
   2, 'government', 'focus', NULL, NULL),

  ('kingdom-over-this-place', 'What the Kingdom fixes here',
   'Find one thing this country is struggling with right now: war, hunger, drought, a ruler nobody chose. Read Micah 4:1-4, then write two lines about what will be different here when the Kingdom comes.',
   2, 'government', 'focus', NULL, NULL),

  ('river-that-matters', 'Follow their biggest river',
   'Find the biggest river or lake in the country. Trace where it starts and where it ends, and write down one town that sits on it.',
   2, 'land', 'focus', NULL, NULL),

  ('highest-point', 'Find the highest place',
   'Find the highest mountain or hill in the country and how high it is. Then write down something near you that is about that tall, so you can picture it.',
   2, 'land', 'focus', NULL, NULL),

  ('under-the-ground', 'Find out what they dig up',
   'Find out what people take out of the ground there: oil, copper, salt, diamonds, or not much at all. Write down what it gets used for.',
   2, 'land', 'focus', NULL, NULL),

  ('desert-shall-blossom', 'Find the land that needs healing',
   'Find the driest, most worn-out or most polluted place in this country. Read Isaiah 35:1-2, then draw that same place the way it will look when the land is healed.',
   2, 'land', 'focus', NULL, NULL),

  ('weather-that-hits', 'Find the weather they brace for',
   'Find out what kind of big weather this country gets: hurricanes, monsoons, drought, blizzards, or none worth naming. Write down one way people get ready for it.',
   2, 'climate', 'focus', NULL, NULL),

  ('tree-that-grows', 'Find a tree that grows there',
   'Find one tree or plant that grows well in this country. Draw a leaf from it, and write one thing people there make or eat from it.',
   2, 'ecology', 'focus', NULL, NULL),

  ('oldest-thing-here', 'Find the oldest thing they keep',
   'Find the oldest object in one of this country''s museums. Write down what it is, how old it is, and where it was dug up.',
   2, 'prehistory', 'focus', NULL, NULL),

  ('kid-life', 'A day in their life',
   'Find out what a school day looks like for a kid your age in this country. Write three ways it is different from your day.',
   3, 'people', 'focus', NULL, NULL),

  ('life-outdoors', 'Find what they do outside',
   'Find out what people there do outdoors: hiking, fishing, herding, surfing, skiing. Pick one, write where in the country people do it, and why the land there suits it.',
   3, 'people', 'focus', NULL, NULL),

  ('what-people-believe', 'Find the main religion',
   'Find out what religion or religions most people practice there. Find one holiday or celebration that goes with it and write what happens.',
   3, 'culture', 'focus', NULL, NULL),

  ('tonights-dinner', 'Plan tonight''s dinner there',
   'Find a dish people eat there for dinner. Write down what''s in it and draw your plate the way it would look.',
   3, 'food', 'focus', NULL, NULL),

  ('animals-on-the-menu', 'Find the animals they eat',
   'Find out which animals people raise or catch for food in this country. Write down one that people where you live eat too, and one that they don''t. Different isn''t gross, just different.',
   3, 'food', 'focus', NULL, NULL),

  ('story-they-tell', 'Find a story they tell',
   'Find a folk tale, legend, or myth from this country. Write one line about who is in it, and draw the part you would most want to see.',
   3, 'culture', 'focus', NULL, NULL),

  ('who-is-famous', 'Find someone everyone knows',
   'Find one person from this country that almost everyone there would recognize. Write down who they are and what they did to become known.',
   3, 'people', 'focus', NULL, NULL),

  ('holiday-they-mark', 'Find their biggest holiday',
   'Find the one day of the year this whole country celebrates. Write down what it remembers and one thing people do on it.',
   3, 'culture', 'focus', NULL, NULL),

  ('craft-of-the-land', 'Find their craft or art',
   'Find one traditional art or craft from this country: weaving, pottery, painting, carving. Find a picture and draw your own version of the pattern.',
   3, 'culture', 'focus', NULL, NULL),

  ('sound-of-the-country', 'Listen to their music',
   'Find one traditional instrument or style of music from this country. Write its name and one word for what it sounds like.',
   3, 'culture', 'focus', NULL, NULL),

  ('the-sport-they-love', 'Find their favorite sport',
   'Find the most popular sport in this country. Write one rule that is different from a sport you play.',
   3, 'culture', 'focus', NULL, NULL),

  ('wow-fact', 'Find one wow fact',
   'Dig until you find one fact about this country that makes you say "wow." Write it in your own words.',
   3, 'culture', 'focus', NULL, NULL),

  ('landmark-to-see', 'Pick a landmark to visit',
   'Find one famous place in this country you''d want to visit. Draw it and write one sentence about what makes it special.',
   3, 'landmarks', 'focus', NULL, NULL),
  ('girls-and-women', 'Find out how girls grow up there',
   'Find out what school and work look like for girls and women in this country. Write down two things that are different from your house.',
   3, 'people', 'focus', NULL, NULL),

  ('city-and-country', 'City or countryside?',
   'Find out whether most people there live in cities or out in the countryside, and name the biggest city. Write down one reason people are moving where they are moving.',
   3, 'people', 'focus', NULL, NULL),

  ('getting-around', 'Find out how they get around',
   'Find out how people there get to school and to work: bus, train, boat, motorbike, walking. Draw the one you would take and write how long it would take you.',
   3, 'people', 'focus', NULL, NULL),

  ('house-they-live-in', 'Draw an ordinary house',
   'Find a picture of an ordinary home in this country — not a palace. Draw it, and label two things about it that the weather or the land made necessary.',
   3, 'people', 'focus', NULL, NULL),

  ('game-kids-play', 'Learn a game kids play there',
   'Find a game kids play in this country. Write the rules in three lines, then go play one round of it.',
   3, 'people', 'focus', NULL, NULL),

  ('their-rest-day', 'Find their day off',
   'Find out which days are the weekend in this country and which day people rest. Write down what closes on the seventh day there, if anything does.',
   3, 'people', 'focus', NULL, NULL),

  ('sabbath-keepers-there', 'Find who keeps the seventh day',
   'Find out whether anyone in this country keeps a seventh-day Sabbath — Adventists, a Church of God, Jewish or Messianic congregations. Write down what they are called there and roughly how many there are.',
   3, 'culture', 'focus', NULL, NULL),

  ('feast-they-keep', 'Find their harvest feast',
   'Find the biggest harvest or thanksgiving festival in this country and what happens at it. Read Zechariah 14:16, then write one line about the part of it that could still be kept when all nations come up to keep the Feast.',
   3, 'culture', 'focus', NULL, NULL),

  ('place-of-worship', 'Draw where they worship',
   'Find a church, mosque, temple or shrine in this country. Draw the outside, and write one line about what happens inside on their main day.',
   3, 'culture', 'focus', NULL, NULL),

  ('what-they-wear', 'Draw what they wear',
   'Find what people there wear for a wedding, a holiday or a festival. Draw one outfit and label the part that would tell someone where it is from.',
   3, 'culture', 'focus', NULL, NULL),

  ('breakfast-there', 'Eat their breakfast',
   'Find out what people eat for breakfast in this country. Draw the plate, and write down whether you would eat it.',
   3, 'food', 'focus', NULL, NULL),

  ('market-day', 'Walk through their market',
   'Find a photo of a market in this country. List five things being sold in it, and circle the one you have never seen for sale where you live.',
   3, 'food', 'focus', NULL, NULL),

  ('trifold-choose', 'Plan your three panels',
   'Your board has three panels. Decide what goes on each one and sketch the plan on a scrap of paper first.',
   4, 'project', 'core', 'trifold-board', 1),

  ('trifold-gather', 'Gather your materials',
   'Collect everything your plan needs: poster board, markers, glue, printed pictures. Check you have it all before you start building.',
   4, 'project', 'core', 'trifold-board', 2),

  ('trifold-build-left-and-center', 'Build the left and center panels',
   'Put together the first two panels of your board: titles, pictures, and captions glued down and readable from a few feet away.',
   4, 'project', 'core', 'trifold-board', 3),

  ('trifold-build-right-and-finishing', 'Finish the right panel',
   'Finish the last panel, then step back and fix anything crooked, misspelled, or hard to read.',
   4, 'project', 'core', 'trifold-board', 4),

  ('trifold-present', 'Rehearse and present your board',
   'Practice explaining your board out loud once, start to finish. Then present it to your family.',
   4, 'project', 'core', 'trifold-board', 5),
  ('model-choose', 'Decide what you will build',
   'Pick the one scene from your country worth building: a mountain, a market, a temple, a harbor. Sketch it from the side and from above so you know how it will stand up.',
   4, 'project', 'core', 'model-or-diorama', 1),

  ('model-gather', 'Gather your materials',
   'Collect what your model needs: a base to build on, cardboard, clay, paint, paper, glue. Put it all in one place and check nothing is missing before you start.',
   4, 'project', 'core', 'model-or-diorama', 2),

  ('model-build-base', 'Build the base and big shapes',
   'Build the ground your scene sits on and the biggest shapes standing on it. Do not paint anything yet — get it standing first.',
   4, 'project', 'core', 'model-or-diorama', 3),

  ('model-build-details', 'Paint it and add the details',
   'Paint your model and add the small things that make it this country and nowhere else. Write two labels for the parts a visitor would ask about.',
   4, 'project', 'core', 'model-or-diorama', 4),

  ('model-present', 'Show your model and explain it',
   'Practice explaining your model out loud once, start to finish. Then show it to your family and answer their questions.',
   4, 'project', 'core', 'model-or-diorama', 5),

  ('video-choose', 'Plan your shots',
   'Decide what your video will show, then write the shots you need in the order they happen. Six to ten shots is plenty for two minutes.',
   4, 'project', 'core', 'video', 1),

  ('video-gather', 'Gather what you will film',
   'Collect the maps, drawings, objects and props your shot list needs, and find the quietest room in the house to record in.',
   4, 'project', 'core', 'video', 2),

  ('video-shoot', 'Film your shot list',
   'Film your shots one at a time. Say each line twice so you have a spare, and hold the camera still for three seconds after every shot.',
   4, 'project', 'core', 'video', 3),

  ('video-edit', 'Cut it together',
   'Put your shots in order, cut out the mistakes, and put a title on the front. Watch the whole thing once and fix the worst part.',
   4, 'project', 'core', 'video', 4),

  ('video-present', 'Show your video',
   'Watch your video once on your own to check you can hear it. Then play it for your family and tell them one thing you learned making it.',
   4, 'project', 'core', 'video', 5),

  ('skit-choose', 'Pick the scene you will act',
   'Pick one moment from your country worth acting out: a market, a journey, a story they tell. Write who is in it and what happens, in three lines.',
   4, 'project', 'core', 'skit', 1),

  ('skit-gather', 'Gather props and costumes',
   'Collect what your scene needs from around the house: a hat, a length of cloth, a spoon, a map. A prop that is nearly right is fine — a label fixes the rest.',
   4, 'project', 'core', 'skit', 2),

  ('skit-script', 'Write the lines out',
   'Write down what each character says, start to finish. Keep it under two minutes, which is about one page of talking.',
   4, 'project', 'core', 'skit', 3),

  ('skit-rehearse-run', 'Run it twice, out loud',
   'Act your scene all the way through twice, standing up and out loud. Fix the line that trips you both times.',
   4, 'project', 'core', 'skit', 4),

  ('skit-present', 'Perform your skit',
   'Perform your scene for your family, from the top and without stopping. Afterwards, say one sentence about why you picked that moment.',
   4, 'project', 'core', 'skit', 5),

  ('museum-choose', 'Choose your six objects',
   'A museum box holds a few things that tell a whole country. List the six objects yours will hold, and write one line on why each one earns its place.',
   4, 'project', 'core', 'museum-box', 1),

  ('museum-gather', 'Find your box and materials',
   'Find a box about the size of a shoebox and collect what your objects need: clay, paper, foil, fabric, string. Line the box so it opens like a case.',
   4, 'project', 'core', 'museum-box', 2),

  ('museum-make-objects', 'Make the first three objects',
   'Make the first three objects on your list. They do not have to be perfect — they have to be recognizable from across a table.',
   4, 'project', 'core', 'museum-box', 3),

  ('museum-finish-and-label', 'Finish the rest and label them',
   'Make the objects you have left, then write a museum label for each one: what it is, where it is from, and why it matters. Two sentences each.',
   4, 'project', 'core', 'museum-box', 4),

  ('museum-present', 'Open your box for someone',
   'Practice walking through your box once, object by object. Then open it for your family and take them through it.',
   4, 'project', 'core', 'museum-box', 5),

  ('zine-choose', 'Plan your pages',
   'A zine is one sheet folded into eight pages. Fold a scrap sheet, number the pages, and write what goes on each one from the cover to the back.',
   4, 'project', 'core', 'illustrated-zine', 1),

  ('zine-gather', 'Gather your drawings and pens',
   'Collect your paper and pens, and every drawing, map and note from this month you want to copy in. Fold your good sheet so you can see the page order.',
   4, 'project', 'core', 'illustrated-zine', 2),

  ('zine-draw-first', 'Draw the cover and first pages',
   'Draw and letter the cover and the first three pages. Letter the titles before you draw, so the words are not squeezed in afterwards.',
   4, 'project', 'core', 'illustrated-zine', 3),

  ('zine-draw-rest', 'Finish the pages',
   'Finish the pages you have left, then read the whole zine through once and fix anything misspelled or too small to read.',
   4, 'project', 'core', 'illustrated-zine', 4),

  ('zine-present', 'Read your zine out loud',
   'Read your zine out loud once on your own. Then hand it to your family and read it with them, page by page.',
   4, 'project', 'core', 'illustrated-zine', 5)
-- END task_templates
) v
LEFT JOIN project_types p ON p.slug = v.project_type
WHERE true
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Focus weights — sparse. A missing row means weight 1, so only an opinion is
-- stored: 3 for on-theme, 0 to exclude, nothing in between. Every focus needs
-- at least one 3 in week 2 *and* one in week 3, or picking it leaves that week
-- identical to picking nothing; and at most one 0 per focus per week, or a
-- 5-of-8 draw leaves Swap with no candidate. Both are asserted in
-- test/seed-content.test.js.
--
-- Every focus holds three weight-3 rows in week 2 and three in week 3. Two is
-- not enough: both get drawn every month that focus is chosen, and the focus a
-- kid picks nine times has to have nine months in it. wild-places is the one
-- that gets picked, and it is the one this was sized around.
--
-- Joined on slugs, same as above. The join is inner: a slug that matches
-- nothing contributes no row and raises no error, so the row count is checked
-- against this block in the tests rather than trusted.
-- ---------------------------------------------------------------------------
INSERT INTO task_focus_weights (task_template_id, focus_id, weight)
SELECT t.id, f.id, v.weight
FROM (
  SELECT NULL AS task, NULL AS focus, NULL AS weight
  WHERE 0
  UNION ALL VALUES
-- BEGIN task_focus_weights
  ('first-people',        'ancient-world',       3),
  ('ancient-site',        'ancient-world',       3),
  ('wild-animal',         'wild-places',         3),
  ('who-leads',           'people-and-power',    3),
  ('law-you-notice',      'conflict-and-change', 3),
  ('landforms',           'land-and-sky',        3),
  ('landforms',           'food-and-craft',      3),
  ('weather-there-now',   'land-and-sky',        3),
  ('before-history',      'ancient-world',       3),
  ('animal-in-trouble',   'wild-places',         3),
  ('wild-place-protected','wild-places',         3),
  ('law-you-notice',      'people-and-power',    3),
  ('animal-in-trouble',   'conflict-and-change', 3),
  ('what-they-grow',      'food-and-craft',      3),
  ('what-they-grow',      'land-and-sky',        3),
  ('made-here',           'food-and-craft',      3),
  ('made-here',           'people-and-power',    3),
  ('border-that-moved',   'conflict-and-change', 3),
  ('who-leads',           'wild-places',         0),
  ('wild-animal',         'food-and-craft',      0),
  ('weather-there-now',   'ancient-world',       0),

  ('kid-life',             'people-and-power',    3),
  ('tonights-dinner',      'food-and-craft',      3),
  ('craft-of-the-land',    'food-and-craft',      3),
  ('what-people-believe',  'conflict-and-change', 3),
  ('animals-on-the-menu',  'food-and-craft',      3),
  ('life-outdoors',        'wild-places',         3),
  ('life-outdoors',        'land-and-sky',        3),
  ('animals-on-the-menu',  'wild-places',         3),
  ('landmark-to-see',      'ancient-world',       3),
  ('craft-of-the-land',    'ancient-world',       3),
  ('story-they-tell',      'ancient-world',       3),
  ('who-is-famous',        'people-and-power',    3),
  ('who-is-famous',        'conflict-and-change', 3),
  ('holiday-they-mark',    'people-and-power',    3),
  ('holiday-they-mark',    'conflict-and-change', 3),
  ('the-sport-they-love',  'land-and-sky',        3),
  ('landmark-to-see',      'wild-places',         3),
  ('landmark-to-see',      'land-and-sky',        3),
  ('craft-of-the-land',    'people-and-power',    0),
  ('sound-of-the-country', 'conflict-and-change', 0),
  ('wow-fact',             'land-and-sky',        0),
  ('who-ruled-before',      'ancient-world',       3),
  ('war-that-changed',      'ancient-world',       3),
  ('oldest-thing-here',     'ancient-world',       3),
  ('oldest-thing-here',     'food-and-craft',      3),
  ('river-that-matters',    'wild-places',         3),
  ('highest-point',         'wild-places',         3),
  ('tree-that-grows',       'wild-places',         3),
  ('desert-shall-blossom',  'wild-places',         3),
  ('independence-day',      'people-and-power',    3),
  ('who-can-vote',          'people-and-power',    3),
  ('kingdom-over-this-place','people-and-power',   3),
  ('tree-that-grows',       'food-and-craft',      3),
  ('under-the-ground',      'food-and-craft',      3),
  ('independence-day',      'conflict-and-change', 3),
  ('war-that-changed',      'conflict-and-change', 3),
  ('kingdom-over-this-place','conflict-and-change',3),
  ('river-that-matters',    'land-and-sky',        3),
  ('highest-point',         'land-and-sky',        3),
  ('weather-that-hits',     'land-and-sky',        3),
  ('desert-shall-blossom',  'land-and-sky',        3),
  ('who-can-vote',          'land-and-sky',        0),
  ('tree-that-grows',       'people-and-power',    0),
  ('highest-point',         'conflict-and-change', 0),

  ('place-of-worship',      'ancient-world',       3),
  ('sabbath-keepers-there', 'ancient-world',       3),
  ('feast-they-keep',       'ancient-world',       3),
  ('city-and-country',      'wild-places',         3),
  ('getting-around',        'wild-places',         3),
  ('house-they-live-in',    'wild-places',         3),
  ('girls-and-women',       'people-and-power',    3),
  ('city-and-country',      'people-and-power',    3),
  ('their-rest-day',        'people-and-power',    3),
  ('breakfast-there',       'food-and-craft',      3),
  ('market-day',            'food-and-craft',      3),
  ('what-they-wear',        'food-and-craft',      3),
  ('feast-they-keep',       'food-and-craft',      3),
  ('girls-and-women',       'conflict-and-change', 3),
  ('city-and-country',      'conflict-and-change', 3),
  ('sabbath-keepers-there', 'conflict-and-change', 3),
  ('getting-around',        'land-and-sky',        3),
  ('house-they-live-in',    'land-and-sky',        3),
  ('city-and-country',      'land-and-sky',        3),
  ('getting-around',        'ancient-world',       0),
  ('market-day',            'wild-places',         0),
  ('place-of-worship',      'food-and-craft',      0)
-- END task_focus_weights
) v
JOIN task_templates t ON t.slug = v.task
JOIN focuses f ON f.slug = v.focus
WHERE true
ON CONFLICT DO NOTHING;
