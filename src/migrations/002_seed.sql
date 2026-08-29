-- 002_seed.sql — the library, and the three people.
--
-- Every insert here is ON CONFLICT DO NOTHING, so Run seed can press this file
-- as many times as it likes. Once a row exists the seed never touches it again
-- — a title corrected in the library editor survives every future seed run.
--
-- That cuts both ways, and it is why this file is rewritten rather than grown.
-- Correcting a row that has already been seeded changes nothing in a database
-- that already holds it. The fix is Erase everything, Apply pending, Run seed
-- (§3): every table is dropped and rebuilt from these files, so a wrong prompt
-- is an edit here and three button presses rather than a second row somewhere
-- else saying the opposite.
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
-- Focuses (§4). Nine, fixed. The blurb is what the setup screen shows under the
-- name, so it is written to a 5th grader and says what the month will feel
-- like, not what the category is called.
--
-- The last three have no `country_focus_affinity` rows, so they are pickable
-- from the list and never recommended on a country card until D-15 lands. That
-- is a gap in the recommendation and not in the draw: the draw never reads
-- affinity.
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
   'Mountains, rivers, volcanoes, seasons — the ground itself and what it does.'),
  ('who-lives-here', 'Who Lives Here',
   'Whose house, whose school, whose Tuesday — the ordinary day nobody puts in a book.'),
  ('who-gets-what', 'Who Gets What',
   'Who has less of it, who took it, and who is getting paid.'),
  ('stories-and-spirits', 'Stories and Spirits',
   'What they tell each other, what they are called, and what they think is out there.')
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
-- Task templates — 91 rows. 10 in week 1 (4 core + 6 competing for the fifth
-- slot), 26 in week 2, 25 in week 3, and 30 in week 4: five steps each for all
-- six project types.
--
-- Weeks 2 and 3 are one pool of 51, of which 49 are drawable and two are
-- pinned. LIBRARY_v3.md §2 holds 167 week 1-3 prompts and these are the 61 of
-- them that are written; slices 16 to 20 land the other 106, onto the forms and
-- renderers slices 12 to 15 build first. Until they do, the five-month cooldown
-- is sized for a pool three times this one and a learner nine months deep runs
-- on the stalest-back fallback.
--
-- Tier says how a row is chosen, not how hard it is. `core` is always included
-- — week 1's four and every week-4 row. `focus` is the merged weeks 2-3 pool
-- the draw weights. `wild` is week 1's fifth-slot candidates. `fixed` is the
-- two pinned prompts, `wow-fact` in week 2 and `cook-it` in week 3: never
-- weighted, never cooled down, never swapped (§4).
--
-- `week_theme` on a weeks 2-3 row is the prompt's natural half, read only by
-- the deal's arc preference. Nothing in the draw sees it.
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
   'Find a map of your country and trace its outline big enough to fill the box. Then mark three places on it and number them: the capital, the biggest city that isn''t the capital, and one edge — a coast, a mountain range, a border you''d notice.',
   1, 'map', 'core', NULL, NULL),

  ('neighbors-list', 'Find who your country borders',
   'Look at the map and list every country that shares a border with yours, going clockwise from the top. If there are more than eight, list the eight with the longest borders. If it''s an island with no land borders, write down the nearest country across the water instead.',
   1, 'map', 'core', NULL, NULL),

  ('language-hello', 'Say hello and thank you',
   'Find out what language people speak there and how to say "hello" and "thank you." Write each one twice: once copied the way they spell it, and once the way it sounds out loud.',
   1, 'language', 'core', NULL, NULL),

  ('currency-animal', 'What is on their money?',
   'Find a picture of their money. Which animal, plant or person is on it? Draw it, then write who or what it is and why a country would choose to put that on its money.',
   1, 'money', 'wild', NULL, NULL),

  ('national-symbol', 'Draw the national symbol',
   'Find the country''s coat of arms, national animal, or national flower. Draw it and write one sentence about why you think it was chosen.',
   1, 'symbols', 'wild', NULL, NULL),
  ('how-many-people', 'How many people live there?',
   'Find out how many people live in your country. Write the number in the box, then find a US state — or a whole country you already know — with about the same number, so the number means something.',
   1, 'people', 'wild', NULL, NULL),

  ('time-there-now', 'Find out what time it is there',
   'Work out what time it is in their capital right now. Draw the hands on both clocks and write both times in digits underneath, then write one sentence about what people there are probably doing.',
   1, 'map', 'wild', NULL, NULL),

  ('size-next-to-yours', 'How big is it really?',
   'Find out how much land the country covers. Write it in the box, then find a state or a country you already know that is about the same size.',
   1, 'map', 'wild', NULL, NULL),

  ('anthem-listen', 'Listen to their anthem',
   'Find their national anthem and listen to the first thirty seconds. Write one word for how it sounds, and one line about what it says the country is, or hopes it will be.',
   1, 'symbols', 'wild', NULL, NULL),

  ('first-people', 'Find the first known people',
   'Find out who the earliest known people living in this land were and roughly when they were here. Find one thing they left behind that people can still see or dig up.',
   2, 'history', 'focus', NULL, NULL),

  ('ancient-site', 'Find an ancient site',
   'Find one ancient building, ruin, or site in this country that is hundreds or thousands of years old. Draw it, then write how old it is and how people know that.',
   2, 'history', 'focus', NULL, NULL),

  ('who-leads', 'Find out who leads the country',
   'Find out what this country''s leader is called and how a person gets that job. Write the steps in order, from ordinary person to running the country.',
   2, 'government', 'focus', NULL, NULL),

  ('law-you-notice', 'Find three surprising rules',
   'Find three laws in this country that are different from where you live, and write each one next to how it works where you live. Then find one rule that is the same in both places.',
   2, 'government', 'focus', NULL, NULL),

  ('landforms', 'Describe the land',
   'Look at the land: mountains, desert, coastline, plains. Draw the whole country big enough to fill the page, then label six things on it — the highest part, the driest part, where the water is, where nobody lives, where most people do live, and the edge you would notice first if you arrived.',
   2, 'land', 'focus', NULL, NULL),

  ('weather-there-now', 'Check the weather there today',
   'Look up the temperature in their capital city right now and the temperature where you are. Mark both on the thermometer and label each mark.',
   2, 'climate', 'focus', NULL, NULL),

  ('wild-animal', 'Draw a wild animal',
   'Find one wild animal that lives in this country but not where you live. Draw it and write one fact about where it lives.',
   2, 'ecology', 'focus', NULL, NULL),

  ('animal-in-trouble', 'Find an animal in trouble',
   'Find one animal from this country that scientists say is endangered. Find out one reason it is disappearing and roughly how many are left.',
   2, 'ecology', 'focus', NULL, NULL),

  ('wild-place-protected', 'Find their biggest wild place',
   'Find the biggest national park or nature reserve in this country. Draw what it looks like, then name one animal that is safer because the park is there and write what it was in danger from.',
   2, 'ecology', 'focus', NULL, NULL),

  ('what-they-grow', 'Find out what they grow',
   'Find the crop this country grows the most of. Find out which part of the country grows it, and one thing people there make or cook with it.',
   2, 'land', 'focus', NULL, NULL),

  ('made-here', 'Find something made there',
   'Find one thing this country makes and sells to the rest of the world. Check your own house for it first. Draw the trip it takes in four steps, from where it starts to somebody''s house — and if you found one at home, that house is the last box.',
   2, 'money', 'focus', NULL, NULL),

  ('what-work-pays', 'What a week of work buys',
   'Find out what an ordinary job there pays in a week. Then find what bread, a bus ride and a pair of shoes cost there. Work out how many of each a week''s pay buys, and draw a bar for each one.',
   2, 'money', 'focus', NULL, NULL),

  ('border-that-moved', 'Find a border that moved',
   'Find out how this country''s borders have changed in the last two hundred years. Draw the shape it was then and the shape it is now, and write what changed between them — including its name, if that changed too.',
   2, 'history', 'focus', NULL, NULL),

  ('before-history', 'Find something from before writing',
   'Find one fossil, cave painting or prehistoric find from this country that is still in the place it was found. Draw it, then write how long ago it got there and how anyone knows that.',
   2, 'prehistory', 'focus', NULL, NULL),
  ('who-ruled-before', 'Find out who ruled before',
   'Start in 1500 and work forward to now. Mark up to five times this land changed hands — a king, an empire, a set of villages that ran themselves, a country that took over. Write who was in charge at each mark.',
   2, 'history', 'focus', NULL, NULL),

  ('independence-day', 'Find the day they became a country',
   'Find out when this country started ruling itself and who it belonged to before that. Write the date on the arrow, then show who was in charge before and what people do on that day now.',
   2, 'history', 'focus', NULL, NULL),

  ('war-that-changed', 'Find a fight that changed things',
   'Find one war or uprising that changed this country. Mark three moments on the line — when it started, the moment it turned, and when it ended — and write what happened at each one.',
   2, 'history', 'focus', NULL, NULL),

  ('who-can-vote', 'Find out who gets a say',
   'Find three things about voting there: who is allowed to, how old you have to be, and how often they vote. Write each one next to how it works where you live. Then find the one thing about voting that has not changed between them.',
   2, 'government', 'focus', NULL, NULL),

  ('kingdom-over-this-place', 'What the Kingdom fixes here',
   'Find one thing this country is struggling with right now: war, hunger, drought, a ruler nobody chose. Read Micah 4:1-4. Then write five or six lines: what the struggle actually looks like for a family living in it, which verse speaks to it most directly, and what will be different in this place when the Kingdom comes.',
   2, 'government', 'focus', NULL, NULL),

  ('river-that-matters', 'Follow their biggest river',
   'Find the longest river in the country. Draw its whole path on the map, then number and name three places on it: where it starts, where it ends, and one town that sits on it. If the country''s biggest water is a lake instead, draw the lake and the rivers that feed it.',
   2, 'land', 'focus', NULL, NULL),

  ('highest-point', 'How far from the bottom to the top',
   'Find the highest point in this country and the lowest — some countries have ground that sits below the sea. Mark both on the scale, and mark sea level between them. Then write which of the two more people live near, and why.',
   2, 'land', 'focus', NULL, NULL),

  ('under-the-ground', 'Find out what they dig up',
   'Find out what people take out of the ground there: oil, copper, salt, diamonds, stone, sand. Draw four of them and write what each one gets used for. If they only dig up one or two, fill the empty boxes with what they have to buy from somewhere else instead.',
   2, 'land', 'focus', NULL, NULL),

  ('desert-shall-blossom', 'Find the land that needs healing',
   'Find the driest, most worn-out or most polluted place in this country and look at a photo of it. Draw what you see. Then read Isaiah 35:1-2 and draw that same place the way it will look when the land is healed.',
   2, 'land', 'focus', NULL, NULL),

  ('weather-that-hits', 'Find the weather they brace for',
   'Find out what kind of big weather this country gets: hurricanes, monsoons, drought, blizzards, floods. Find what time of year it comes and one way people get ready.',
   2, 'climate', 'focus', NULL, NULL),

  ('tree-that-grows', 'Find a tree that grows there',
   'Find one tree or plant that grows well in this country. Draw a leaf from it, draw its fruit or its seed, and draw one thing people there make or eat from it.',
   2, 'ecology', 'focus', NULL, NULL),

  ('oldest-thing-here', 'Find the oldest thing they keep',
   'Find the oldest object kept in one of this country''s museums. Find out how old it is and where it was dug up.',
   2, 'prehistory', 'focus', NULL, NULL),

  ('who-lives-there', 'Who lives there?',
   'Find out which groups of people make up this country and roughly what share each one is. Color your hundred people to match and write the key yourself. If the country doesn''t count its people this way at all, write that on the key instead.',
   2, 'people', 'focus', NULL, NULL),

  ('how-they-learn', 'Find out how kids there learn',
   'Find out whether school is free there, how many years a kid is required to go, and what it costs a family who has to pay. Then find out whether teaching your own children at home is allowed there, and roughly how many families do it. Write five things you found out, one to a bullet.',
   2, 'people', 'focus', NULL, NULL),

  ('kid-life', 'A day in their life',
   'Walk through an ordinary day for a kid your age there, from waking up to going to bed. Mark five moments on the line and write what is happening at each one.',
   3, 'people', 'focus', NULL, NULL),

  ('life-outdoors', 'Find what they do outside',
   'Find out what people there do outdoors: hiking, fishing, herding, surfing, skiing. Pick one and draw somebody doing it, then write where in the country people do it and why the land there suits it.',
   3, 'people', 'focus', NULL, NULL),

  ('what-people-believe', 'Find the main religion',
   'Find three faiths people keep in this country — or, if there is really only one, the one they keep and two they used to. For each, write when it first arrived there and name one day it keeps.',
   3, 'culture', 'focus', NULL, NULL),

  ('tonights-dinner', 'Plan tonight''s dinner there',
   'Find a dish people eat there on an ordinary weeknight, not a feast day. Draw the plate the way it would come to the table, write what''s on it, and write the one thing you would have to go looking for to make it at your house.',
   3, 'food', 'focus', NULL, NULL),

  ('animals-on-the-menu', 'Find the animals they eat',
   'Find out which animals people raise or catch for food in this country. Write the ones only they eat on their side, the ones only you eat on yours, and the ones both of you eat in the middle. Different isn''t gross, just different.',
   3, 'food', 'focus', NULL, NULL),

  ('story-they-tell', 'Find a story they tell',
   'Find a folk tale, legend, or myth from this country. Tell the whole thing in six pictures, start to finish. If a panel needs a word to make sense, write it inside the panel.',
   3, 'culture', 'focus', NULL, NULL),

  ('who-is-famous', 'Find someone everyone knows',
   'Find one person from this country that almost everyone there would recognize. Draw the thing they are known for — the ball, the instrument, the book, the medal — then write who they are and what they did.',
   3, 'people', 'focus', NULL, NULL),

  ('holiday-they-mark', 'Find their biggest holiday',
   'Find the one day of the year this whole country celebrates. Find what it remembers and one thing people do on it.',
   3, 'culture', 'focus', NULL, NULL),

  ('craft-of-the-land', 'Find their craft or art',
   'Find one traditional art or craft from this country: weaving, pottery, painting, carving. Find a picture of the pattern and draw it four times, the way it would repeat across a real rug, pot or cloth. Label the colors.',
   3, 'culture', 'focus', NULL, NULL),

  ('sound-of-the-country', 'Listen to their music',
   'Find one traditional instrument or style of music from this country and listen to a minute of it. Find out what the instrument is made of, and write one word for how it sounds.',
   3, 'culture', 'focus', NULL, NULL),

  ('the-sport-they-love', 'Find their favorite sport',
   'Find the most popular sport in this country. Write three of its rules next to the rules of a game you play. Then write the one rule both games share.',
   3, 'culture', 'focus', NULL, NULL),

  ('wow-fact', 'Find one wow fact',
   'Dig until you find one fact about this country that makes you say "wow." Write it in your own words.',
   2, 'culture', 'fixed', NULL, NULL),

  ('landmark-to-see', 'Pick a landmark to visit',
   'Find one famous place in this country you''d want to visit. Draw it and write one sentence about what makes it special.',
   3, 'landmarks', 'focus', NULL, NULL),
  ('girls-and-women', 'Find out how girls grow up there',
   'Find out what learning and work look like for girls and women in this country. Write three things next to how they are where you live. Then write the one thing that is no different at all.',
   3, 'people', 'focus', NULL, NULL),

  ('city-and-country', 'City or countryside?',
   'Find out how many people out of every hundred there live in cities and how many live out in the countryside. Color a row for each, then label one row with their biggest city and the other with the part of the country most of the farming happens in.',
   3, 'people', 'focus', NULL, NULL),

  ('getting-around', 'Find out how they get around',
   'Find out how people there travel to work, to market and to school. Find out how long an ordinary kid''s trip takes and write it in the box, then write the longest trip anyone in our house makes in a week.',
   3, 'people', 'focus', NULL, NULL),

  ('house-they-live-in', 'Draw an ordinary house',
   'Find a picture of an ordinary home in this country, not a palace. Draw it and label three things the weather or the land made necessary.',
   3, 'people', 'focus', NULL, NULL),

  ('game-kids-play', 'Learn a game kids play there',
   'Find a game kids play in this country. Write the rules in three lines, then go play one round of it.',
   3, 'people', 'focus', NULL, NULL),

  ('their-rest-day', 'Find their day off',
   'Find out which days are the weekend in this country and which day people rest — and find out which day they call the first day of the week, because it is not the same everywhere. Shade the days most people do not work, then write what closes on their rest day, if anything does, and which day their week starts on.',
   3, 'people', 'focus', NULL, NULL),

  ('sabbath-keepers-there', 'Find who keeps the seventh day',
   'Find out whether anyone in this country keeps a seventh-day Sabbath — Adventists, a Church of God, Jewish or Messianic congregations. Find what they are called there, roughly how many there are, and when and where they meet.',
   3, 'culture', 'focus', NULL, NULL),

  ('feast-they-keep', 'Find their harvest feast',
   'Find the biggest harvest or thanksgiving festival in this country and what happens at it — what is cooked, what is carried, who comes. Read Zechariah 14:16. Then write five or six lines: what the feast is for now, which parts of it are about the harvest and which are about something else, and the part of it that could still be kept when all nations come up to keep the Feast.',
   3, 'culture', 'focus', NULL, NULL),

  ('place-of-worship', 'Draw where they worship',
   'Find a church, mosque, temple or shrine in this country. Draw the outside, and write one line about what happens inside on their main day.',
   3, 'culture', 'focus', NULL, NULL),

  ('what-they-wear', 'Draw what they wear',
   'Find what people there wear for a wedding, a holiday or a festival. Draw one outfit and label three parts: the one that says where it''s from, the one made by hand, and the one you''d wear yourself.',
   3, 'culture', 'focus', NULL, NULL),

  ('breakfast-there', 'Eat their breakfast',
   'Find out what people eat for breakfast in this country. Write what is on their plate on their side, what is on yours on yours, and anything that turns up on both in the middle.',
   3, 'food', 'focus', NULL, NULL),

  ('market-day', 'Walk through their market',
   'Find a photo of a market in this country. Draw four things being sold in it and label each one, then circle the one you have never seen for sale where you live.',
   3, 'food', 'focus', NULL, NULL),

  ('cook-it', 'Cook one thing from your country',
   'Pick one dish from anything you found this month and find a real recipe for it. Copy it onto your recipe page in your own handwriting, then make it with a grown-up. Write down what you''d change next time.',
   3, 'food', 'fixed', NULL, NULL),

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
-- Prompt tags — what a prompt is about, and how the answer gets produced.
--
-- Two namespaces and never one vocabulary. `topic` is what the prompt is about
-- and is the only thing a focus can weight; `mode` is how the kid produces the
-- answer and carries no weight at all. `us-contrast` reaches a quarter of the
-- finished library, so a focus allowed to weight it at 3 would pull a quarter
-- of the pool in one move (LIBRARY_v3.md §3).
--
-- Mode tags do two jobs instead. No two prompts sharing one land in the same
-- month, which is what stops a month printing three sheets that all say *and
-- now write ours next to it*; and every month holds at least one `hands-on`
-- and one `personal-voice` prompt, which is the only mechanism guaranteeing a
-- month in which somebody from the country actually speaks.
--
-- 177 rows over the 61 week 1-3 prompts that are seeded — 145 topic, 32 mode.
-- A prompt and its tags are never separated: an untagged prompt draws at
-- baseline forever and nothing reports it, so every prompt slice adds tags in
-- the same edit that adds the prompts they belong to.
--
-- No `personal-voice` row is here, because none of the eight prompts carrying
-- it is written yet. The repair budget in the draw falls back to an ordinary
-- wildcard when a mode has no candidate, so the month rule is satisfied by
-- `cook-it` alone until slice 20 lands the voices.
--
-- Joined on slugs like everything else. A slug matching nothing contributes no
-- row and raises no error, so the count is asserted in the tests rather than
-- trusted.
-- ---------------------------------------------------------------------------
INSERT INTO prompt_tags (task_template_id, namespace, tag)
SELECT t.id, v.namespace, v.tag
FROM (
  SELECT NULL AS task, NULL AS namespace, NULL AS tag
  WHERE 0
  UNION ALL VALUES
-- BEGIN prompt_tags
  ('flag-draw',               'topic', 'emblems'),
  ('flag-draw',               'topic', 'crafts'),
  ('map-outline',             'topic', 'landform'),
  ('map-outline',             'topic', 'city-life'),
  ('map-outline',             'mode', 'map-work'),
  ('neighbors-list',          'topic', 'landform'),
  ('neighbors-list',          'topic', 'conflict-history'),
  ('neighbors-list',          'mode', 'map-work'),
  ('language-hello',          'topic', 'language'),
  ('language-hello',          'mode', 'hands-on'),
  ('currency-animal',         'topic', 'emblems'),
  ('currency-animal',         'topic', 'public-money'),
  ('national-symbol',         'topic', 'emblems'),
  ('national-symbol',         'topic', 'wildlife'),
  ('how-many-people',         'topic', 'city-life'),
  ('how-many-people',         'mode', 'demographics-stat'),
  ('how-many-people',         'mode', 'us-contrast'),
  ('time-there-now',          'topic', 'sun-and-seasons'),
  ('time-there-now',          'topic', 'daily-life'),
  ('time-there-now',          'mode', 'measurement'),
  ('time-there-now',          'mode', 'us-contrast'),
  ('size-next-to-yours',      'topic', 'landform'),
  ('size-next-to-yours',      'mode', 'measurement'),
  ('size-next-to-yours',      'mode', 'us-contrast'),
  ('anthem-listen',           'topic', 'emblems'),
  ('anthem-listen',           'topic', 'music-and-art'),
  ('anthem-listen',           'mode', 'hands-on'),
  ('first-people',            'topic', 'deep-time'),
  ('first-people',            'topic', 'empire-and-rule'),
  ('ancient-site',            'topic', 'crafts'),
  ('ancient-site',            'topic', 'empire-and-rule'),
  ('who-leads',               'topic', 'governance'),
  ('who-leads',               'topic', 'civic-process'),
  ('law-you-notice',          'topic', 'governance'),
  ('law-you-notice',          'topic', 'daily-life'),
  ('law-you-notice',          'mode', 'us-contrast'),
  ('landforms',               'topic', 'landform'),
  ('landforms',               'topic', 'city-life'),
  ('landforms',               'mode', 'map-work'),
  ('weather-there-now',       'topic', 'weather-pattern'),
  ('weather-there-now',       'mode', 'measurement'),
  ('weather-there-now',       'mode', 'us-contrast'),
  ('wild-animal',             'topic', 'wildlife'),
  ('wild-animal',             'topic', 'landform'),
  ('animal-in-trouble',       'topic', 'extinction'),
  ('animal-in-trouble',       'topic', 'wildlife'),
  ('animal-in-trouble',       'topic', 'damage-and-repair'),
  ('wild-place-protected',    'topic', 'wildlife'),
  ('wild-place-protected',    'topic', 'damage-and-repair'),
  ('wild-place-protected',    'topic', 'landform'),
  ('what-they-grow',          'topic', 'agriculture'),
  ('what-they-grow',          'topic', 'everyday-food'),
  ('what-they-grow',          'topic', 'trade'),
  ('made-here',               'topic', 'trade'),
  ('made-here',               'topic', 'work-and-money'),
  ('made-here',               'mode', 'hands-on'),
  ('what-work-pays',          'topic', 'work-and-money'),
  ('what-work-pays',          'topic', 'public-money'),
  ('what-work-pays',          'mode', 'us-contrast'),
  ('border-that-moved',       'topic', 'conflict-history'),
  ('border-that-moved',       'topic', 'empire-and-rule'),
  ('border-that-moved',       'topic', 'landform'),
  ('border-that-moved',       'mode', 'map-work'),
  ('before-history',          'topic', 'deep-time'),
  ('before-history',          'topic', 'folklore-belief'),
  ('before-history',          'topic', 'crafts'),
  ('who-ruled-before',        'topic', 'empire-and-rule'),
  ('who-ruled-before',        'topic', 'governance'),
  ('independence-day',        'topic', 'empire-and-rule'),
  ('independence-day',        'topic', 'milestone'),
  ('independence-day',        'topic', 'holiday-calendar'),
  ('war-that-changed',        'topic', 'conflict-history'),
  ('war-that-changed',        'topic', 'empire-and-rule'),
  ('who-can-vote',            'topic', 'governance'),
  ('who-can-vote',            'topic', 'civic-process'),
  ('who-can-vote',            'topic', 'who-gets-less'),
  ('who-can-vote',            'mode', 'us-contrast'),
  ('kingdom-over-this-place', 'topic', 'religion'),
  ('kingdom-over-this-place', 'topic', 'governance'),
  ('kingdom-over-this-place', 'topic', 'who-gets-less'),
  ('kingdom-over-this-place', 'mode', 'scripture-read'),
  ('river-that-matters',      'topic', 'water'),
  ('river-that-matters',      'topic', 'landform'),
  ('river-that-matters',      'topic', 'city-life'),
  ('river-that-matters',      'mode', 'map-work'),
  ('highest-point',           'topic', 'altitude'),
  ('highest-point',           'topic', 'landform'),
  ('highest-point',           'mode', 'measurement'),
  ('under-the-ground',        'topic', 'who-owns-it'),
  ('under-the-ground',        'topic', 'trade'),
  ('under-the-ground',        'topic', 'landform'),
  ('desert-shall-blossom',    'topic', 'damage-and-repair'),
  ('desert-shall-blossom',    'topic', 'water'),
  ('desert-shall-blossom',    'topic', 'landform'),
  ('desert-shall-blossom',    'mode', 'scripture-read'),
  ('weather-that-hits',       'topic', 'weather-pattern'),
  ('weather-that-hits',       'topic', 'damage-and-repair'),
  ('weather-that-hits',       'topic', 'sun-and-seasons'),
  ('tree-that-grows',         'topic', 'wildlife'),
  ('tree-that-grows',         'topic', 'agriculture'),
  ('tree-that-grows',         'topic', 'everyday-food'),
  ('oldest-thing-here',       'topic', 'deep-time'),
  ('oldest-thing-here',       'topic', 'crafts'),
  ('who-lives-there',         'topic', 'who-gets-less'),
  ('who-lives-there',         'topic', 'migration'),
  ('who-lives-there',         'mode', 'demographics-stat'),
  ('how-they-learn',          'topic', 'schooling'),
  ('how-they-learn',          'topic', 'public-money'),
  ('how-they-learn',          'topic', 'family'),
  ('kid-life',                'topic', 'daily-life'),
  ('kid-life',                'topic', 'schooling'),
  ('kid-life',                'topic', 'family'),
  ('life-outdoors',           'topic', 'play-and-sport'),
  ('life-outdoors',           'topic', 'landform'),
  ('life-outdoors',           'topic', 'daily-life'),
  ('what-people-believe',     'topic', 'religion'),
  ('what-people-believe',     'topic', 'migration'),
  ('what-people-believe',     'topic', 'holiday-calendar'),
  ('tonights-dinner',         'topic', 'everyday-food'),
  ('tonights-dinner',         'topic', 'daily-life'),
  ('animals-on-the-menu',     'topic', 'everyday-food'),
  ('animals-on-the-menu',     'topic', 'animals-with-people'),
  ('animals-on-the-menu',     'topic', 'agriculture'),
  ('animals-on-the-menu',     'mode', 'us-contrast'),
  ('story-they-tell',         'topic', 'folklore-belief'),
  ('story-they-tell',         'topic', 'story-telling'),
  ('who-is-famous',           'topic', 'music-and-art'),
  ('who-is-famous',           'topic', 'play-and-sport'),
  ('who-is-famous',           'topic', 'story-telling'),
  ('holiday-they-mark',       'topic', 'holiday-calendar'),
  ('holiday-they-mark',       'topic', 'story-telling'),
  ('craft-of-the-land',       'topic', 'crafts'),
  ('craft-of-the-land',       'topic', 'music-and-art'),
  ('sound-of-the-country',    'topic', 'music-and-art'),
  ('sound-of-the-country',    'topic', 'crafts'),
  ('sound-of-the-country',    'mode', 'hands-on'),
  ('the-sport-they-love',     'topic', 'play-and-sport'),
  ('the-sport-they-love',     'topic', 'daily-life'),
  ('the-sport-they-love',     'mode', 'us-contrast'),
  ('wow-fact',                'topic', 'story-telling'),
  ('landmark-to-see',         'topic', 'crafts'),
  ('landmark-to-see',         'topic', 'travel'),
  ('landmark-to-see',         'topic', 'city-life'),
  ('girls-and-women',         'topic', 'who-gets-less'),
  ('girls-and-women',         'topic', 'schooling'),
  ('girls-and-women',         'topic', 'work-and-money'),
  ('girls-and-women',         'mode', 'us-contrast'),
  ('city-and-country',        'topic', 'city-life'),
  ('city-and-country',        'topic', 'agriculture'),
  ('city-and-country',        'mode', 'demographics-stat'),
  ('getting-around',          'topic', 'travel'),
  ('getting-around',          'topic', 'infrastructure'),
  ('getting-around',          'topic', 'daily-life'),
  ('getting-around',          'mode', 'measurement'),
  ('getting-around',          'mode', 'us-contrast'),
  ('house-they-live-in',      'topic', 'housing'),
  ('house-they-live-in',      'topic', 'weather-pattern'),
  ('house-they-live-in',      'topic', 'crafts'),
  ('game-kids-play',          'topic', 'play-and-sport'),
  ('game-kids-play',          'topic', 'daily-life'),
  ('game-kids-play',          'mode', 'hands-on'),
  ('their-rest-day',          'topic', 'sabbath'),
  ('their-rest-day',          'topic', 'daily-life'),
  ('their-rest-day',          'topic', 'religion'),
  ('sabbath-keepers-there',   'topic', 'sabbath'),
  ('sabbath-keepers-there',   'topic', 'religion'),
  ('sabbath-keepers-there',   'topic', 'christian-history'),
  ('feast-they-keep',         'topic', 'holiday-calendar'),
  ('feast-they-keep',         'topic', 'religion'),
  ('feast-they-keep',         'topic', 'agriculture'),
  ('feast-they-keep',         'mode', 'scripture-read'),
  ('place-of-worship',        'topic', 'religion'),
  ('place-of-worship',        'topic', 'crafts'),
  ('what-they-wear',          'topic', 'clothing'),
  ('what-they-wear',          'topic', 'crafts'),
  ('what-they-wear',          'topic', 'holiday-calendar'),
  ('breakfast-there',         'topic', 'everyday-food'),
  ('breakfast-there',         'topic', 'daily-life'),
  ('breakfast-there',         'mode', 'us-contrast'),
  ('market-day',              'topic', 'everyday-food'),
  ('market-day',              'topic', 'city-life'),
  ('market-day',              'topic', 'trade'),
  ('cook-it',                 'topic', 'everyday-food'),
  ('cook-it',                 'topic', 'celebration-food'),
  ('cook-it',                 'topic', 'crafts'),
  ('cook-it',                 'mode', 'hands-on')
-- END prompt_tags
) v
JOIN task_templates t ON t.slug = v.task
WHERE true
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Focus tags — what a focus favours, over tags rather than over prompts.
--
-- 65 rows over nine focuses, from LIBRARY_v3.md §3's focus table. A focus
-- declares an affinity once and every prompt carrying a matching topic tag is
-- drawn correctly from then on, including prompts written afterwards. That is
-- the whole reason this replaced a hand-typed weight per prompt: 167 prompts
-- against nine focuses is 1,503 opinions nobody will maintain, and the tag
-- table is 65 rows that self-onboard the next 107 prompts.
--
-- Sparse: an absent tag is no opinion. The draw's floor is `1 + 2 * SUM(weight)`
-- over shared topic tags, so a prompt no focus reaches is still drawn at 1 and
-- the heaviest single prompt stays under 5% of pool weight (§4).
--
-- People and Power does not weight `civic-process`. All four of its prompts
-- carry `governance` too, so weighting both pays twice for the same four rows.
-- The tag stays on those prompts as documentation of what they are.
--
-- Seven topic tags carry no weight from any focus — `clothing`, `emblems`,
-- `future-plans`, `holiday-calendar`, `infrastructure`, `sabbath`,
-- `science-research`. That is deliberate: they describe prompts no focus is
-- about, and the `1 +` floor keeps every one of them reachable.
-- ---------------------------------------------------------------------------
INSERT INTO focus_tags (focus_id, tag, weight)
SELECT f.id, v.tag, v.weight
FROM (
  SELECT NULL AS focus, NULL AS tag, NULL AS weight
  WHERE 0
  UNION ALL VALUES
-- BEGIN focus_tags
  ('ancient-world',       'deep-time',           3),
  ('ancient-world',       'empire-and-rule',     3),
  ('ancient-world',       'crafts',              3),
  ('ancient-world',       'folklore-belief',     2),
  ('ancient-world',       'christian-history',   2),
  ('ancient-world',       'story-telling',       2),
  ('ancient-world',       'extinction',          1),

  ('wild-places',         'wildlife',            3),
  ('wild-places',         'extinction',          3),
  ('wild-places',         'landform',            3),
  ('wild-places',         'damage-and-repair',   2),
  ('wild-places',         'water',               2),
  ('wild-places',         'animals-with-people', 2),
  ('wild-places',         'play-and-sport',      2),
  ('wild-places',         'agriculture',         1),

  ('people-and-power',    'governance',          3),
  ('people-and-power',    'advocacy',            2),
  ('people-and-power',    'public-services',     2),
  ('people-and-power',    'public-money',        2),
  ('people-and-power',    'schooling',           2),
  ('people-and-power',    'who-gets-less',       2),
  ('people-and-power',    'conflict-history',    1),

  ('food-and-craft',      'everyday-food',       3),
  ('food-and-craft',      'celebration-food',    3),
  ('food-and-craft',      'agriculture',         3),
  ('food-and-craft',      'crafts',              2),
  ('food-and-craft',      'trade',               2),
  ('food-and-craft',      'animals-with-people', 1),

  ('conflict-and-change', 'conflict-history',    3),
  ('conflict-and-change', 'empire-and-rule',     3),
  ('conflict-and-change', 'forced-movement',     3),
  ('conflict-and-change', 'migration',           2),
  ('conflict-and-change', 'milestone',           2),
  ('conflict-and-change', 'who-gets-less',       2),
  ('conflict-and-change', 'damage-and-repair',   1),

  ('land-and-sky',        'landform',            3),
  ('land-and-sky',        'weather-pattern',     3),
  ('land-and-sky',        'sun-and-seasons',     3),
  ('land-and-sky',        'altitude',            2),
  ('land-and-sky',        'water',               2),
  ('land-and-sky',        'agriculture',         2),
  ('land-and-sky',        'travel',              1),

  ('who-lives-here',      'family',              3),
  ('who-lives-here',      'daily-life',          3),
  ('who-lives-here',      'schooling',           2),
  ('who-lives-here',      'housing',             2),
  ('who-lives-here',      'names',               2),
  ('who-lives-here',      'health',              2),
  ('who-lives-here',      'city-life',           2),
  ('who-lives-here',      'migration',           1),

  ('who-gets-what',       'who-gets-less',       3),
  ('who-gets-what',       'who-owns-it',         3),
  ('who-gets-what',       'forced-movement',     3),
  ('who-gets-what',       'advocacy',            2),
  ('who-gets-what',       'empire-and-rule',     2),
  ('who-gets-what',       'public-money',        2),
  ('who-gets-what',       'work-and-money',      2),
  ('who-gets-what',       'health',              1),

  ('stories-and-spirits', 'folklore-belief',     3),
  ('stories-and-spirits', 'story-telling',       3),
  ('stories-and-spirits', 'names',               3),
  ('stories-and-spirits', 'religion',            2),
  ('stories-and-spirits', 'music-and-art',       2),
  ('stories-and-spirits', 'christian-history',   2),
  ('stories-and-spirits', 'language',            1)
-- END focus_tags
) v
JOIN focuses f ON f.slug = v.focus
WHERE true
ON CONFLICT DO NOTHING;
