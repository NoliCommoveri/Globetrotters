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
-- All nine carry `country_focus_affinity` rows in 003, so all nine are both
-- pickable from the list and recommended on some country card. A focus with no
-- rows would be a gap in the recommendation and not in the draw: the draw never
-- reads affinity.
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
-- Task templates — 197 rows. 12 in week 1 (4 core + 8 competing for the fifth
-- slot), 86 in week 2, 69 in week 3, and 30 in week 4: five steps each for all
-- six project types.
--
-- Weeks 2 and 3 are one pool of 155, of which 153 are drawable and two are
-- pinned. That is the whole of LIBRARY_v3.md §2's 167 week 1-3 prompts, and the
-- pool the draw's numbers are measured against: the three-month cooldown never
-- reaches the stalest-back fallback, and every one of the 153 can be drawn.
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
   4, 'project', 'core', 'illustrated-zine', 5),

  ('how-far-away-is-it', 'How far away is it?',
   'Find out how many miles it is from our house to their capital city. Write the number in the box, then work out how many times that is the longest drive our family has ever actually made. If you have time, find how many hours a plane takes to fly it, and what that works out to in miles an hour.',
   1, 'map', 'wild', NULL, NULL),

  ('in-their-numbers', 'Find the measurements only they use',
   'Nearly every country measures in meters and kilograms — but most also kept older units of their own for land, rice, cloth, or distance walked. Find four things people there still measure their own way. Write each unit the way they say it, and next to it what it measures and roughly how big it is. If they truly use nothing but metric, find the four units they gave up and when they gave them up.',
   1, 'map', 'wild', NULL, NULL),

  ('long-before-people', 'What was walking here before anyone was',
   'Find four creatures that lived on this land long before people did — dinosaurs, giant birds, mammoths, sea reptiles, cats with the wrong teeth. Mark roughly when each one lived and write its name at the mark. Notice how far along the line you get before the first one shows up. If nothing has been dug up in this country, use the nearest country that has and write which one.',
   2, 'prehistory', 'focus', NULL, NULL),

  ('dinosaur-that-lived-here', 'Draw the one that lived here first',
   'Find a dinosaur or other giant animal that lived where this country is now. Draw it alive, standing in the land the way it was then, and label three parts of it that tell you what it ate or how it moved. If nothing has been found there, draw the closest one that has been, and label where it was dug up.',
   2, 'prehistory', 'focus', NULL, NULL),

  ('the-last-hundred-years', 'The last hundred years, in five marks',
   'Find the five things that happened in this country in the last hundred years that people there would say changed it most — not the five a book here would pick. Mark each one and write what happened in a few words.',
   2, 'history', 'focus', NULL, NULL),

  ('who-was-taken-from-here', 'Find out whether people were taken from here — or brought here',
   'Find out whether people from this country were ever taken away to work for someone else — sold, shipped, marched, or born into it — or whether people were brought here that way. Draw where they were taken from and to, and write on the arrow how many, and for how long. If neither happened here, find who does the worst-paid work here now and where they come from, and draw that instead.',
   2, 'history', 'focus', NULL, NULL),

  ('somebody-elses-museum', 'Find something of theirs in somebody else''s museum',
   'Find one thing made in this country that is now kept in a museum in another country. Draw the place it was made and the room it sits in now, and write on the arrow who took it and what year. Underneath, write whether anybody has asked for it back and what happened. If nothing of theirs ever left, find something in their museums that came from somewhere else, and do it that way round.',
   2, 'history', 'focus', NULL, NULL),

  ('when-it-reached-everybody', 'When ordinary people got it',
   'Pick four of these and find the year each one reached ordinary families there, then the year it reached ordinary families here: electric light at home, running water in the house, school required for every child, women voting, a telephone in most homes.',
   2, 'history', 'focus', NULL, NULL),

  ('made-there-first', 'Find something the world got from them',
   'Find one thing invented, written, painted, built or composed in this country that people outside it still use or still know. Draw it — or draw its cover — then write who made it and how it got out into the world.',
   2, 'history', 'focus', NULL, NULL),

  ('how-they-say-it-began', 'Find the story they tell about where they came from',
   'Every country has a story about how it began, and it is usually not the one in the history book — a brother and a wolf, a bird that dropped a stone, an ancestor who walked out of the sea. Find this country''s and write it in your own words, then write one line about what a history book says happened instead.',
   2, 'history', 'focus', NULL, NULL),

  ('bible-name-now-name', 'Find this place in the Bible',
   'Find out whether this land, a place in it, or a people from it is named anywhere in Scripture — Tarshish, Cush, Sheba, Macedonia, Media, the isles of the sea. Write three names the way the Bible writes them, and next to each the name the place goes by now. If nothing here is named, do it for the nearest land that is.',
   2, 'history', 'focus', NULL, NULL),

  ('bible-in-their-tongue', 'When they first read it for themselves',
   'Find out when the good news first reached this land, when the Bible was first printed in the language most people there speak, and one date since. Mark all three and write what happened at each mark. If it has never been printed in their language, mark the two you have and write that on the third.',
   2, 'history', 'focus', NULL, NULL),

  ('the-first-church-there', 'Draw the oldest one still standing',
   'Find the oldest church or Christian meeting place still standing in this country. Draw it, then write when it was built and who built it. If there is none, draw the oldest place of worship there is and write when Christians first came — or that they have not.',
   2, 'history', 'focus', NULL, NULL),

  ('can-they-worship-freely', 'Find out what it costs to believe there',
   'Find out whether people in this country are free to worship, to meet, to own a Bible, to change what they believe. Read Matthew 5:10-12 and Hebrews 13:3. Then write five or six lines: what a believer there risks, what they do anyway, and what you would find hardest about it. If everybody there is free to believe what they like, write about who was not, the last time somebody wasn''t.',
   2, 'government', 'focus', NULL, NULL),

  ('how-a-law-is-made', 'Follow a law from an idea to a rule',
   'Find out how something becomes a law in this country. Follow it through four boxes, from somebody''s idea to the thing everybody has to obey, and write in each box who has to say yes.',
   2, 'government', 'focus', NULL, NULL),

  ('is-the-law-kept', 'Find out whether the law is kept',
   'Find three things the law there is supposed to protect: children not working, a wage a job must pay, a day off in the working week, clean water, a school every child may attend. For each one, write what the law says, then find out what actually happens — and write down how you know.',
   2, 'government', 'focus', NULL, NULL),

  ('if-you-break-a-rule-there', 'Find out what happens if you break a rule there',
   'Find three things that are against the law in this country — a small one, a middle one, and a serious one. For each, write what happens to a person who does it and who decides.',
   2, 'government', 'focus', NULL, NULL),

  ('whats-in-the-news', 'Find out what they are talking about',
   'Find a newspaper or news site published in this country and read one headline from this month — a machine translation is fine, and the odd broken sentence is part of it. Write what happened in your own words, the way you would tell it to somebody at dinner.',
   2, 'government', 'focus', NULL, NULL),

  ('what-they-plan-next', 'What they say they are trying to do',
   'Find this country''s own plan for the next ten years — governments publish them and give them names. Write five things it says the country is trying to have done, one to a bullet, in the plan''s own order. If they have not published one, find the last speech their leader gave about the future and use that. Then put a star next to the one you do not think will happen.',
   2, 'government', 'focus', NULL, NULL),

  ('who-speaks-up-there', 'Find the people asking for something',
   'Find a group in this country that is asking their government to change something — for farmers, disabled people, a language, a river, people with no house. Write four things that group is asking for, one to a bullet. If nobody there is allowed to ask their government for anything in public, find somebody outside the country asking on their behalf, and write down what they are asking for.',
   2, 'government', 'focus', NULL, NULL),

  ('what-they-do-for-you', 'Find out what the government does for a family',
   'Find out what a family there gets without paying for it directly: a doctor, a fire truck, someone to take the trash, help if the money runs out, a road to the house, water. Write five things a family there can count on, one to a bullet, and put a star next to any that a family here would have to pay for.',
   2, 'government', 'focus', NULL, NULL),

  ('who-comes-when-it-burns', 'Find out who comes when something goes wrong',
   'Find out who turns up there if a house catches fire, if somebody is hurt and needs a hospital, and if somebody is in danger. Write each one next to who would come to our house. Then write the one thing that works the same way in both places.',
   2, 'government', 'focus', NULL, NULL),

  ('help-when-money-runs-out', 'Find out what happens when a family runs out of money',
   'Find three kinds of help a family with no money can get in this country — food, rent, a payment for children, work training, a place to sleep. For each one, write who is allowed to have it and who pays for it: the government, a church, a charity, nobody.',
   2, 'government', 'focus', NULL, NULL),

  ('what-they-are-working-on', 'Find what their scientists are building',
   'Find out what people in this country are researching or building right now: a rocket, a telescope, a seed bank, a medicine, a machine that thinks, a way to catch water. Draw the thing, then write who is paying for it and what they hope it does. If nothing there is big enough to make the news, find out what they are studying about their own land — a crop, a disease, a fish count.',
   2, 'government', 'focus', NULL, NULL),

  ('where-the-price-goes', 'Find out who gets the money',
   'Pick one thing this country sells to the rest of the world — coffee, cocoa, cobalt, cotton, bananas, cut flowers. Out of every hundred dollars a shopper pays for it, find how much reaches the farmer or miner, how much the company keeps, how much goes on shipping, and how much the shop keeps. Draw a bar for each. If nobody has worked it out for this country, use the closest country that sells it.',
   2, 'money', 'focus', NULL, NULL),

  ('the-company-that-got-caught', 'Find a company that got caught',
   'Find one time a company — theirs, or a foreign one working there — did something to this country people are still angry about: a spill, a collapse, a river, a wage, a forest, a mine. Mark three moments on the line: when it started, when people found out, and what happened since. If you cannot find one, find the biggest company there, who owns it, and mark three big dates in its life instead.',
   2, 'money', 'focus', NULL, NULL),

  ('the-work-nobody-wants', 'Find out who does the work nobody there wants',
   'Find three jobs in this country that people there try not to do — dangerous, filthy, badly paid, or done out of sight. For each one write who actually does it — a particular group of people, people from another country, women, children — and what it pays.',
   2, 'money', 'focus', NULL, NULL),

  ('who-they-trade-with', 'Who buys what they sell',
   'Find the five countries this country sells the most to. List them biggest first, and put a star next to ours if it is on the list.',
   2, 'money', 'focus', NULL, NULL),

  ('made-because-they-needed-it', 'Find something they made because they needed it',
   'Find one thing invented, designed or first made in this country to solve a problem people there actually had — a stove, a pump, a crop, a boat built for their water, a way of paying without a bank. Draw it, then write what the problem was and whether anybody outside the country uses it now.',
   2, 'money', 'focus', NULL, NULL),

  ('what-their-money-goes-to', 'Where their government''s money goes',
   'Out of every hundred dollars this country''s government spends, find out roughly how much goes to schools, to hospitals and doctors, to soldiers, and to roads and building. Draw a bar for each one. If they do not publish it, use the World Bank''s numbers and write on the sheet that that is where they came from.',
   2, 'money', 'focus', NULL, NULL),

  ('your-money-there', 'Turn your money into theirs',
   'Find out what their money is called and what one US dollar is worth in it today. Then write three amounts in their money and in ours: one dollar, everything you have saved right now, and what you would need to buy lunch for our whole family there.',
   2, 'money', 'focus', NULL, NULL),

  ('their-working-day', 'Find out how long their working day is',
   'Find out what time an ordinary job there starts and what time it finishes. Draw the hands on both clocks and write both times in digits, then write how many hours that is in a week there and how many hours a week a full job is here.',
   2, 'money', 'focus', NULL, NULL),

  ('how-high-they-live', 'How high up is their capital?',
   'Find out how many feet above sea level their capital city sits, and how high our own town sits. Mark both on the scale and label each mark.',
   2, 'land', 'focus', NULL, NULL),

  ('where-the-ground-shakes', 'Find where the ground is not still',
   'Find out whether this country gets earthquakes or has volcanoes. Mark three places on the map and name them: one volcano or fault line, the last place a big quake hit, and the nearest big city to it. If the ground there never moves, mark the three places most at risk from flood instead.',
   2, 'land', 'focus', NULL, NULL),

  ('where-the-food-grows', 'Map where their food comes from',
   'Mark three places on the map and name them: where their main crop is grown, where animals are kept or fish are caught, and the city most of that food is carried to.',
   2, 'land', 'focus', NULL, NULL),

  ('what-the-land-is-used-for', 'What the land is doing',
   'Out of every hundred acres of this country, find out how many are farmed and how many are forest or wild. Color a row for each and label the rows.',
   2, 'land', 'focus', NULL, NULL),

  ('water-to-the-tap', 'Follow their water home',
   'Find out where drinking water comes from in this country. Fill the four boxes from where it falls or is pumped through to somebody''s cup, and mark the box where it gets cleaned — or write that there isn''t one.',
   2, 'land', 'focus', NULL, NULL),

  ('where-the-trash-goes', 'Follow their garbage',
   'Find out what happens to household rubbish there. Put four boxes between the bin in somebody''s kitchen and wherever it finally stops, and write in the box where anything gets sorted or reused — or write on the last box that nothing does.',
   2, 'land', 'focus', NULL, NULL),

  ('rain-in-a-year', 'How wet is it there?',
   'Find out how many inches of rain fall in their capital in a year, and how many fall where we live. Mark both on the scale and label each mark.',
   2, 'climate', 'focus', NULL, NULL),

  ('rain-through-the-year', 'When their rain comes',
   'Find out how much rain falls in their capital in January, in April, in July and in October. Draw a bar for each month, then write underneath which of those months a farmer there would be watching. If their capital is not where the farming is, use the biggest farming town instead and say which one.',
   2, 'climate', 'focus', NULL, NULL),

  ('climate-bands', 'Put their weather on the map',
   'Find a climate map of this country. Shade the different weather bands onto the map, then mark and name four of them: the wettest part, the driest part, the part where snow falls — or write that none of it does — and the band most people actually live in.',
   2, 'climate', 'focus', NULL, NULL),

  ('the-one-that-is-gone', 'The animal that is not there anymore',
   'Find an animal that lived in this country within the last few hundred years and is now gone for good — one people actually saw, not one dug out of rock. Draw it in the place it lived, then draw that same place today, and write on the arrow the year the last one was seen. If nothing there has gone for good, find the one that is down to its last few hundred and draw the place it used to range.',
   2, 'ecology', 'focus', NULL, NULL),

  ('plants-that-heal', 'Find what they grow for medicine',
   'Find four plants that grow in this country that people there use as medicine — for a fever, a cut, a cough, a stomach. Draw each one and write what it is used for underneath. Circle any that a doctor here would also hand you.',
   2, 'ecology', 'focus', NULL, NULL),

  ('the-group-that-gets-less', 'Find out who there gets less',
   'In most countries one group gets less than the others — less school, less money, less land, less say, less safety. Find out who that is in this country and write four things they get less of, one to a bullet. If people there disagree about whether it is happening at all, write what each side says instead.',
   2, 'people', 'focus', NULL, NULL),

  ('what-work-they-do', 'What a hundred of them do all day',
   'If this country were a hundred working people, find out how many farm or fish, how many make things in factories or workshops, how many sell things or serve people, and how many do something else. Color your hundred to match and write the key yourself.',
   2, 'people', 'focus', NULL, NULL),

  ('the-job-a-kid-does', 'Draw a kid there at work',
   'Find out what work children there actually do — in a field, a workshop, a mine, a market, a house that is not theirs. Draw one of them doing it, then write how old they usually are and what they are not doing while they do it. If children there do not work, find out what stopped it and what year.',
   2, 'people', 'focus', NULL, NULL),

  ('how-many-languages', 'Count their languages',
   'Find four languages actually spoken there, not just the official one: the official one, the one most people speak at home, and two more — including one only a few thousand people still speak.',
   2, 'people', 'focus', NULL, NULL),

  ('most-common-names', 'The names half of them have',
   'Find the most common name for a man there, the most common for a woman, and the most common family name. For each, write roughly how many people carry it and where the name came from — a saint, a king, a job, a place, a word that means something. If nobody counts names there, use the phone book of their biggest city and say that is what you used.',
   2, 'people', 'focus', NULL, NULL),

  ('family-size', 'How big is a family there?',
   'Find the average number of children in a family there and write it next to the number in our house, along with two more things about how families there are put together — who else lives in the house, who looks after the small ones. Then write the one thing about families that turns out to be the same in both houses.',
   2, 'people', 'focus', NULL, NULL),

  ('young-or-old', 'A country of kids or of grandparents?',
   'Find out how many people out of every hundred there are under 15, how many are between 15 and 65, and how many are over 65. Draw a bar for each.',
   2, 'people', 'focus', NULL, NULL),

  ('how-long-they-live', 'How long people live',
   'Find the average life expectancy there. Write it in the box, then write ours underneath and one reason for the gap between them.',
   2, 'people', 'focus', NULL, NULL),

  ('who-can-read', 'How many of them read',
   'Out of every hundred grown men in this country, find out how many can read and write. Then find the same number for grown women. Color a row for each and label the rows. If nearly everybody there can read, find the nearest country where that is not true, put its numbers on the second row, and write both names on the key.',
   2, 'people', 'focus', NULL, NULL),

  ('who-finishes-school', 'How far does learning go?',
   'Find out how many kids out of every hundred there finish secondary school, and how many go on to university. Color one row for each and label the rows.',
   2, 'people', 'focus', NULL, NULL),

  ('when-you-are-old-enough', 'How old you have to be there',
   'Find out how old you have to be in this country to leave school, to have a job, and to drive. Write each one next to how old you have to be here. Then find the one age that is the same on both sides.',
   2, 'people', 'focus', NULL, NULL),

  ('how-you-get-a-house', 'Find out how a family gets a house there',
   'Find out how an ordinary family there comes to have a home: saving for it, borrowing from a bank, inheriting it, renting it, or building it themselves out of what is nearby. Take the five boxes from no house to living in it for the most common way, and write in each box who is paying.',
   2, 'people', 'focus', NULL, NULL),

  ('who-owns-the-roof', 'How many of them own their home',
   'Out of every hundred families there, find out how many own the home they live in rather than renting it. Then find the same number for families here. Color a row for each and label the rows.',
   2, 'people', 'focus', NULL, NULL),

  ('who-came-and-who-left', 'Who came and who left',
   'Find out where people there have moved from, and where people from there have moved to. Name the two countries most tied to this one by people moving, and one reason they went.',
   2, 'people', 'focus', NULL, NULL),

  ('who-they-took-in', 'Find out who ran to this country',
   'Find out whether people from anywhere else have run to this country to be safe. Name three groups who did, and for each write what they were running from and roughly how many came. If it went the other way and people ran out of here instead, do it that way round and say so on the sheet.',
   2, 'people', 'focus', NULL, NULL),

  ('where-they-go-when-they-go', 'Find out where they go',
   'Find three places people from this country go when they leave home: the country most of them travel to, the city inside their own country most people head for, and one place they go for work. For each, write who goes and why. If most people there never leave the district they were born in, name the three places they do go — a market town, a shrine, a hospital — and write that instead.',
   2, 'people', 'focus', NULL, NULL),

  ('what-a-kid-carries', 'What''s in their bag',
   'Find out what a kid your age there carries with them on an ordinary day. List five things, one to a bullet. If one of them is something you have never had to carry, put a star next to it.',
   3, 'people', 'focus', NULL, NULL),

  ('what-they-can-plug-in', 'What they can plug in',
   'Out of every hundred people there, find out how many have electricity at home, how many have a phone of their own, and how many can get on the Internet. Draw a bar for each.',
   3, 'people', 'focus', NULL, NULL),

  ('what-they-keep', 'Find out what animals live with them',
   'Find out what animals people there keep — in the house, in the yard, on the roof, tied up outside. Draw four of them and write under each whether it is a pet, a worker, or dinner. Circle the one that would surprise somebody here.',
   3, 'people', 'focus', NULL, NULL),

  ('street-animals', 'Find out who the animals in the street belong to',
   'Find out what animals walk around loose in a town there — dogs, cats, cows, goats, monkeys, chickens. Draw one where you would actually see it, then write who feeds it, whether anybody owns it, and what happens to it if it gets sick. If nothing runs loose there, find out what stops it.',
   3, 'people', 'focus', NULL, NULL),

  ('find-them-near-us', 'Find this country near our house',
   'Find the closest place to us run by people from this country, or selling what they sell — a restaurant, a shop, a church, a grocery aisle, a market stall. Draw the sign or the front of it, then write how far away it is and one thing you could go and buy there this week. If there is nothing within a drive, find the nearest city that has one and how far that is.',
   3, 'people', 'focus', NULL, NULL),

  ('what-every-kid-learns', 'What a kid there is expected to know',
   'Find out what subjects kids there are taught between about six and eleven years old. Write five of them, one to a bullet. Then in the sixth bullet, write one thing families there teach their own children that nobody teaches in a school.',
   3, 'people', 'focus', NULL, NULL),

  ('from-school-to-work', 'From their first school day to a job',
   'Find out how a kid there gets from the first day of school to a job. Draw the five steps in order — the schools, the tests, the training — and write how old a person is at each step.',
   3, 'people', 'focus', NULL, NULL),

  ('first-money-they-earn', 'Find out how old they are when they start working',
   'Find out how old most people there are when they start earning money — not the age the law allows, the age it actually happens. Write that age in the box, then write what the first job usually is and how old the youngest person in our house was when they first earned anything.',
   3, 'people', 'focus', NULL, NULL),

  ('getting-around-if-you-cant-walk', 'Find out what an ordinary day costs somebody there in a wheelchair',
   'Find out what a person there who cannot walk, cannot see or cannot hear runs into on an ordinary day — the buses, the doorways, the school, the job, whether anybody is required by law to make it easier. Write four things you found, one to a bullet.',
   3, 'people', 'focus', NULL, NULL),

  ('if-you-get-sick', 'What happens if you get sick there',
   'Find out where a family there goes when a child is sick, how far they travel to get there, and who pays for it. Write each one next to how it works at our house. Then write the one part of it that goes the same way in both houses.',
   3, 'people', 'focus', NULL, NULL),

  ('what-they-plow-with', 'Draw the tool they work with',
   'Find the machine or tool people there use to work the land or move what they grow — an ox and plow, a rice thresher, a tractor, a fishing boat, a donkey cart. Draw it and label three parts, and write next to each what that part does.',
   3, 'people', 'focus', NULL, NULL),

  ('where-you-buy-clothes', 'Find out where you would go for clothes',
   'Find out where people there actually get their clothes: a market stall, a tailor who measures you, a shop in a mall, secondhand from somewhere else, or made at home. Pick four things — shoes, a coat, everyday clothes, and something for a wedding or a feast — and write where you would go for each and who made it.',
   3, 'people', 'focus', NULL, NULL),

  ('have-they-been-away', 'How many of them have left',
   'Out of every hundred people there, find out roughly how many have ever traveled to another country. Then find the same number for here. Color a row for each and label the rows. If nobody counts it there, count passports instead and write that on the key.',
   3, 'people', 'focus', NULL, NULL),

  ('city-then-and-now', 'The same street, a hundred years apart',
   'Find two photographs of the same place in one of their cities, about a hundred years apart. Draw what you see in each one, and write underneath what is gone and what is still there. If nobody photographed their cities that long ago, use a painting or a drawing for the first panel and say which.',
   3, 'people', 'focus', NULL, NULL),

  ('a-whole-name', 'Take a name apart',
   'Find a real full name from this country — a president, a writer, a footballer, a singer. Write it big enough to fill the box, then label three parts: the name their family chose for them, a name they got from a parent or a place, and one part we do not have at all — a father''s name, a mother''s family name, a clan, a title. Then put a star on the part a teacher there would call out first.',
   3, 'language', 'focus', NULL, NULL),

  ('what-they-name-babies-now', 'What they are calling babies this year',
   'Find the five most popular names for babies born there in the last year or two. List them most popular first, and circle any you have heard on a real person here. If they have not published a list, find the five most common names in one school class there instead.',
   3, 'people', 'focus', NULL, NULL),

  ('their-alphabet', 'Copy out their letters',
   'Find out what writing people there use. Copy four letters, characters or marks from it as carefully as you can, and write under each one what sound it makes. Circle the one that makes a sound English does not have. If they write in our alphabet, find the letters or marks they use that we do not.',
   3, 'language', 'focus', NULL, NULL),

  ('word-they-have', 'Find a word we don''t have',
   'Find two words in their language that take a whole sentence to say in English — a feeling, a kind of weather, a thing people do together, a time of day. Write each word the way they spell it, and next to it the sentence it takes us.',
   3, 'language', 'focus', NULL, NULL),

  ('ask-for-the-bathroom', 'Learn to ask for the things you would actually need',
   'Learn to ask four things in their language: where the bathroom is, where the train or bus station is, how much something costs, and how to say you don''t understand. Write each one the way they spell it and the way it sounds, then say all four out loud to somebody in this house.',
   3, 'language', 'focus', NULL, NULL),

  ('what-makes-them-laugh', 'Find out what is funny there',
   'Find a joke, a cartoon or a comedian from this country and work out why it is funny. You may need somebody to explain it — a joke that has to be explained is still a finding. Write the joke in your own words and what you had to know first for it to work.',
   3, 'culture', 'focus', NULL, NULL),

  ('who-worships-what', 'A hundred of them, and what they believe',
   'If this country were a hundred people, find out how many follow each faith there, and how many follow none. Color your hundred to match and write the key yourself, biggest group first.',
   3, 'culture', 'focus', NULL, NULL),

  ('when-sabbath-starts', 'Find out when their Sabbath begins',
   'Find what time the sun sets on Friday in their capital city, and what time it sets here. Draw the hands on both clocks and write both times in digits, then write one line about who is sitting down to rest there while we are still in the afternoon.',
   3, 'culture', 'focus', NULL, NULL),

  ('sun-up-sun-down', 'Their shortest day',
   'Find out what time the sun comes up and goes down in their capital on the shortest day of the year. Draw the hands on both clocks and write both times in digits, then write how many hours of daylight that leaves them and how many we get on ours.',
   3, 'culture', 'focus', NULL, NULL),

  ('nations-before-the-throne', 'What this country brings',
   'Read Revelation 7:9-10. Then write five or six lines about this country standing in that crowd: the language they would sing it in, the words for salvation and our God in that language, and the one thing you learned this month that you would miss if this country were not there.',
   3, 'culture', 'focus', NULL, NULL),

  ('bible-happened-here', 'Tell what happened here',
   'Find something in the Bible that happened in this land or on its coast — a journey, a shipwreck, a letter written to it, a king who came from it. Tell the whole thing in six pictures, start to finish. If nothing in Scripture happened here, tell the story of how the Bible first arrived instead.',
   3, 'culture', 'focus', NULL, NULL),

  ('creature-they-warn-about', 'Draw the thing children there are warned about',
   'Every country has something people say is out there — in the forest, in the river, in the mountains, under the bed. Find one from this country. Draw it the way people there describe it, then write who it is supposed to come for and what you are meant to do if you meet it.',
   3, 'culture', 'focus', NULL, NULL),

  ('luck-there', 'Find out what brings luck and what breaks it',
   'Find four things people there believe bring good luck or bad — a number, a color, a bird, a day, a word you do not say out loud, something you must not do with your left hand. Write each one on the left and what it is supposed to do on the right.',
   3, 'culture', 'focus', NULL, NULL),

  ('what-the-old-people-say', 'Five things they say that are not in any book',
   'Find five things older people there tell younger ones as if they were plainly true — about weather, about food, about what makes you sick, about what you must not do after dark. Write them one to a bullet, and put a star next to any that turns out to be right.',
   3, 'culture', 'focus', NULL, NULL),

  ('how-they-remember-the-dead', 'Find out what they do when somebody dies',
   'Find out what happens there when a person dies — where they are buried or burned, what the family wears, how long they stay home, and whether there is a day in the year when everybody goes to visit the dead. Draw the grave, the shrine, or the place people go, and write one thing they do that we do not.',
   3, 'culture', 'focus', NULL, NULL),

  ('holidays-through-the-year', 'Their year, in six days',
   'Find six days this country stops for. List them in the order they come through the year, starting in January, and write next to each whether it is a religious day, a country day, or a harvest day.',
   3, 'culture', 'focus', NULL, NULL),

  ('same-day-different-name', 'The days we both keep',
   'Find out which days this country marks that we do not, which days we mark that they do not, and which days both of us keep. Write them in the three parts of the circles — and for anything in the middle, write next to it what they call it.',
   3, 'culture', 'focus', NULL, NULL),

  ('what-year-is-it-there', 'Find out what year it is there',
   'Some countries do not count years from the birth of Christ, and some run two calendars at once — one for the office, one for the holidays. Find the year it is right now on the calendar used for feast days there. Write it in the box, then what their count starts from and when their new year falls. If they use our calendar, find the last one they used and the year they changed.',
   3, 'culture', 'focus', NULL, NULL),

  ('how-they-make-it', 'Watch something get made',
   'Find out how one thing this country is known for is actually made — a cloth, a pot, a knife, a cheese, a paper, an instrument. Tell it in six pictures from raw material to finished thing. If a panel needs a word to make sense, write it inside the panel.',
   3, 'culture', 'focus', NULL, NULL),

  ('before-you-visit', 'Four things to know before you knock',
   'Find out what counts as polite there and what would embarrass a visitor: shoes, greetings, hands, gifts, how loud to be, what you call somebody older than you. Write four things you would want to know before the door opened, one to a bullet.',
   3, 'culture', 'focus', NULL, NULL),

  ('school-lunch', 'What kids eat in the middle of the day',
   'Find out what a kid your age there eats in the middle of the day, who cooks it, and whether the family pays for it. Write each one next to how lunch works at our house. Then write the one thing about lunch you would not have to explain to a kid from there.',
   3, 'food', 'focus', NULL, NULL),

  ('famous-dish', 'The dish they''re known for',
   'Find the one dish a person from this country would name first if you asked what to eat there. Write what goes in it and one reason it became the famous one.',
   3, 'food', 'focus', NULL, NULL),

  ('holiday-dish', 'The food that only comes once a year',
   'Find the dish people there only make for one holiday. Write which day it belongs to and one reason it''s saved for that day.',
   3, 'food', 'focus', NULL, NULL),

  ('something-sweet', 'Find something sweet',
   'Find a dessert, cake or sweet people there make for special days. Draw it, then write what makes it sweet — honey, dates, sugar cane, fruit — and what day of the year people there make it for.',
   3, 'food', 'focus', NULL, NULL),

  ('street-food', 'What they''d buy with their own money',
   'Find one thing sold from a stall or a cart there that a kid could buy with their own coins. Find out where you would buy it and what it costs.',
   3, 'food', 'focus', NULL, NULL),

  ('drink-with-dinner', 'What''s in their cup',
   'Find out what people there drink with a meal: tea, coffee, juice, milk, something you''ve never heard of. Write how it''s made and whether it''s served hot or cold.',
   3, 'food', 'focus', NULL, NULL),

  ('market-days', 'Find out when the market runs',
   'Find out which days of the week the main market or market day happens in a town there. Shade those days, then write what the biggest one is for — food, animals, cloth, everything.',
   3, 'food', 'focus', NULL, NULL),

  ('grows-better-there', 'Find something you love that grows better there',
   'Pick a food you actually like to eat and find out whether it grows better in this country than it does here. Draw it growing — on the tree, in the ground, on the vine — then write what their land or weather gives it that ours doesn''t, and where the ones in our kitchen come from.',
   3, 'food', 'focus', NULL, NULL),

  ('hear-from-a-kid', 'Hear it from someone who lives there',
   'Find a kid or a young person from this country describing their own life — a video, an interview, a letter, a school project posted online. Write down one thing they said that you would never have guessed from anything else you found this month.',
   3, 'people', 'focus', NULL, NULL),

  ('what-they-say-about-us', 'Hear what they say about us',
   'Find somebody from this country talking or writing about visiting or moving to America — what surprised them, what they missed, what they thought was strange. Write what they said in your own words. If you cannot find anyone who came here, find somebody from there writing about any country that is not their own.',
   3, 'people', 'focus', NULL, NULL)
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
-- 262 rows over the 88 week 1-3 prompts that are seeded — 217 topic, 45 mode.
-- A prompt and its tags are never separated: an untagged prompt draws at
-- baseline forever and nothing reports it, so every prompt slice adds tags in
-- the same edit that adds the prompts they belong to.
--
-- Two of the eight prompts carrying `personal-voice` are seeded —
-- `whats-in-the-news` and `who-speaks-up-there` — and six are not. The repair
-- budget in the draw falls back to an ordinary wildcard when a mode has no
-- other candidate, so the month rule holds against a pool this thin until
-- slice 20 lands the rest.
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
  ('cook-it',                 'mode', 'hands-on'),
  ('how-far-away-is-it',      'topic', 'travel'),
  ('how-far-away-is-it',      'mode', 'measurement'),
  ('how-far-away-is-it',      'mode', 'us-contrast'),
  ('in-their-numbers',        'topic', 'trade'),
  ('in-their-numbers',        'topic', 'crafts'),
  ('in-their-numbers',        'topic', 'daily-life'),
  ('in-their-numbers',        'mode', 'measurement'),
  ('long-before-people',      'topic', 'deep-time'),
  ('long-before-people',      'topic', 'extinction'),
  ('long-before-people',      'topic', 'wildlife'),
  ('dinosaur-that-lived-here', 'topic', 'deep-time'),
  ('dinosaur-that-lived-here', 'topic', 'extinction'),
  ('the-last-hundred-years',  'topic', 'milestone'),
  ('the-last-hundred-years',  'topic', 'conflict-history'),
  ('the-last-hundred-years',  'topic', 'empire-and-rule'),
  ('who-was-taken-from-here', 'topic', 'forced-movement'),
  ('who-was-taken-from-here', 'topic', 'empire-and-rule'),
  ('who-was-taken-from-here', 'topic', 'conflict-history'),
  ('somebody-elses-museum',   'topic', 'empire-and-rule'),
  ('somebody-elses-museum',   'topic', 'who-owns-it'),
  ('somebody-elses-museum',   'topic', 'crafts'),
  ('when-it-reached-everybody', 'topic', 'milestone'),
  ('when-it-reached-everybody', 'topic', 'infrastructure'),
  ('when-it-reached-everybody', 'topic', 'public-services'),
  ('when-it-reached-everybody', 'mode', 'us-contrast'),
  ('made-there-first',        'topic', 'science-research'),
  ('made-there-first',        'topic', 'crafts'),
  ('made-there-first',        'topic', 'music-and-art'),
  ('how-they-say-it-began',   'topic', 'folklore-belief'),
  ('how-they-say-it-began',   'topic', 'story-telling'),
  ('how-they-say-it-began',   'topic', 'empire-and-rule'),
  ('bible-name-now-name',     'topic', 'christian-history'),
  ('bible-name-now-name',     'topic', 'empire-and-rule'),
  ('bible-name-now-name',     'topic', 'language'),
  ('bible-name-now-name',     'mode', 'scripture-read'),
  ('bible-in-their-tongue',   'topic', 'christian-history'),
  ('bible-in-their-tongue',   'topic', 'language'),
  ('bible-in-their-tongue',   'topic', 'milestone'),
  ('the-first-church-there',  'topic', 'christian-history'),
  ('the-first-church-there',  'topic', 'religion'),
  ('the-first-church-there',  'topic', 'crafts'),
  ('can-they-worship-freely', 'topic', 'religion'),
  ('can-they-worship-freely', 'topic', 'governance'),
  ('can-they-worship-freely', 'topic', 'advocacy'),
  ('can-they-worship-freely', 'topic', 'who-gets-less'),
  ('can-they-worship-freely', 'mode', 'scripture-read'),
  ('how-a-law-is-made',       'topic', 'governance'),
  ('how-a-law-is-made',       'topic', 'civic-process'),
  ('is-the-law-kept',         'topic', 'who-gets-less'),
  ('is-the-law-kept',         'topic', 'governance'),
  ('is-the-law-kept',         'topic', 'work-and-money'),
  ('if-you-break-a-rule-there', 'topic', 'governance'),
  ('if-you-break-a-rule-there', 'topic', 'who-gets-less'),
  ('if-you-break-a-rule-there', 'topic', 'civic-process'),
  ('if-you-break-a-rule-there', 'mode', 'us-contrast'),
  ('whats-in-the-news',       'topic', 'governance'),
  ('whats-in-the-news',       'topic', 'city-life'),
  ('whats-in-the-news',       'mode', 'personal-voice'),
  ('what-they-plan-next',     'topic', 'future-plans'),
  ('what-they-plan-next',     'topic', 'governance'),
  ('who-speaks-up-there',     'topic', 'advocacy'),
  ('who-speaks-up-there',     'topic', 'governance'),
  ('who-speaks-up-there',     'topic', 'who-gets-less'),
  ('who-speaks-up-there',     'mode', 'personal-voice'),
  ('what-they-do-for-you',    'topic', 'public-services'),
  ('what-they-do-for-you',    'topic', 'governance'),
  ('what-they-do-for-you',    'topic', 'public-money'),
  ('what-they-do-for-you',    'mode', 'us-contrast'),
  ('who-comes-when-it-burns', 'topic', 'public-services'),
  ('who-comes-when-it-burns', 'topic', 'infrastructure'),
  ('who-comes-when-it-burns', 'mode', 'us-contrast'),
  ('help-when-money-runs-out', 'topic', 'public-services'),
  ('help-when-money-runs-out', 'topic', 'public-money'),
  ('help-when-money-runs-out', 'topic', 'who-gets-less'),
  ('what-they-are-working-on', 'topic', 'science-research'),
  ('what-they-are-working-on', 'topic', 'future-plans'),
  ('where-the-price-goes',     'topic', 'who-owns-it'),
  ('where-the-price-goes',     'topic', 'trade'),
  ('where-the-price-goes',     'topic', 'who-gets-less'),
  ('where-the-price-goes',     'mode',  'us-contrast'),
  ('the-company-that-got-caught', 'topic', 'who-owns-it'),
  ('the-company-that-got-caught', 'topic', 'damage-and-repair'),
  ('the-company-that-got-caught', 'topic', 'advocacy'),
  ('the-work-nobody-wants',    'topic', 'who-gets-less'),
  ('the-work-nobody-wants',    'topic', 'work-and-money'),
  ('the-work-nobody-wants',    'topic', 'forced-movement'),
  ('who-they-trade-with',      'topic', 'trade'),
  ('who-they-trade-with',      'topic', 'who-owns-it'),
  ('who-they-trade-with',      'mode',  'us-contrast'),
  ('made-because-they-needed-it', 'topic', 'science-research'),
  ('made-because-they-needed-it', 'topic', 'infrastructure'),
  ('what-their-money-goes-to', 'topic', 'public-money'),
  ('what-their-money-goes-to', 'topic', 'governance'),
  ('what-their-money-goes-to', 'topic', 'public-services'),
  ('what-their-money-goes-to', 'mode',  'us-contrast'),
  ('your-money-there',         'topic', 'public-money'),
  ('your-money-there',         'topic', 'travel'),
  ('your-money-there',         'mode',  'measurement'),
  ('your-money-there',         'mode',  'us-contrast'),
  ('their-working-day',        'topic', 'work-and-money'),
  ('their-working-day',        'topic', 'daily-life'),
  ('their-working-day',        'mode',  'us-contrast'),
  ('their-working-day',        'mode',  'measurement'),
  ('how-high-they-live',       'topic', 'altitude'),
  ('how-high-they-live',       'topic', 'city-life'),
  ('how-high-they-live',       'mode',  'measurement'),
  ('how-high-they-live',       'mode',  'us-contrast'),
  ('where-the-ground-shakes',  'topic', 'landform'),
  ('where-the-ground-shakes',  'topic', 'damage-and-repair'),
  ('where-the-ground-shakes',  'topic', 'infrastructure'),
  ('where-the-ground-shakes',  'mode',  'map-work'),
  ('where-the-food-grows',     'topic', 'agriculture'),
  ('where-the-food-grows',     'topic', 'landform'),
  ('where-the-food-grows',     'topic', 'everyday-food'),
  ('where-the-food-grows',     'mode',  'map-work'),
  ('what-the-land-is-used-for', 'topic', 'agriculture'),
  ('what-the-land-is-used-for', 'topic', 'landform'),
  ('what-the-land-is-used-for', 'topic', 'wildlife'),
  ('what-the-land-is-used-for', 'mode',  'demographics-stat'),
  ('water-to-the-tap',         'topic', 'water'),
  ('water-to-the-tap',         'topic', 'infrastructure'),
  ('water-to-the-tap',         'topic', 'public-services'),
  ('water-to-the-tap',         'topic', 'daily-life'),
  ('where-the-trash-goes',     'topic', 'public-services'),
  ('where-the-trash-goes',     'topic', 'damage-and-repair'),
  ('where-the-trash-goes',     'topic', 'city-life'),
  ('rain-in-a-year',           'topic', 'weather-pattern'),
  ('rain-in-a-year',           'topic', 'water'),
  ('rain-in-a-year',           'mode',  'measurement'),
  ('rain-in-a-year',           'mode',  'us-contrast'),
  ('rain-through-the-year',    'topic', 'weather-pattern'),
  ('rain-through-the-year',    'topic', 'water'),
  ('rain-through-the-year',    'topic', 'agriculture'),
  ('rain-through-the-year',    'topic', 'sun-and-seasons'),
  ('climate-bands',            'topic', 'weather-pattern'),
  ('climate-bands',            'topic', 'landform'),
  ('climate-bands',            'topic', 'city-life'),
  ('climate-bands',            'mode',  'map-work'),
  ('the-one-that-is-gone',     'topic', 'extinction'),
  ('the-one-that-is-gone',     'topic', 'wildlife'),
  ('the-one-that-is-gone',     'topic', 'damage-and-repair'),
  ('plants-that-heal',         'topic', 'health'),
  ('plants-that-heal',         'topic', 'folklore-belief'),
  ('plants-that-heal',         'topic', 'wildlife'),
  ('the-group-that-gets-less', 'topic', 'who-gets-less'),
  ('the-group-that-gets-less', 'topic', 'advocacy'),
  ('the-group-that-gets-less', 'mode',  'demographics-stat'),
  ('what-work-they-do',        'topic', 'work-and-money'),
  ('what-work-they-do',        'topic', 'agriculture'),
  ('what-work-they-do',        'topic', 'city-life'),
  ('what-work-they-do',        'mode',  'demographics-stat'),
  ('the-job-a-kid-does',       'topic', 'who-gets-less'),
  ('the-job-a-kid-does',       'topic', 'work-and-money'),
  ('the-job-a-kid-does',       'topic', 'schooling'),
  ('how-many-languages',       'topic', 'language'),
  ('how-many-languages',       'topic', 'who-gets-less'),
  ('how-many-languages',       'mode',  'demographics-stat'),
  ('most-common-names',        'topic', 'names'),
  ('most-common-names',        'topic', 'language'),
  ('most-common-names',        'topic', 'religion'),
  ('most-common-names',        'mode',  'demographics-stat'),
  ('family-size',              'topic', 'family'),
  ('family-size',              'topic', 'daily-life'),
  ('family-size',              'mode',  'demographics-stat'),
  ('family-size',              'mode',  'us-contrast'),
  ('young-or-old',             'topic', 'health'),
  ('young-or-old',             'topic', 'schooling'),
  ('young-or-old',             'mode',  'demographics-stat'),
  ('how-long-they-live',       'topic', 'health'),
  ('how-long-they-live',       'topic', 'who-gets-less'),
  ('how-long-they-live',       'mode',  'demographics-stat'),
  ('how-long-they-live',       'mode',  'us-contrast'),
  ('who-can-read',             'topic', 'schooling'),
  ('who-can-read',             'topic', 'who-gets-less'),
  ('who-can-read',             'mode',  'demographics-stat'),
  ('who-finishes-school',      'topic', 'schooling'),
  ('who-finishes-school',      'topic', 'who-gets-less'),
  ('who-finishes-school',      'mode',  'demographics-stat'),
  ('when-you-are-old-enough',  'topic', 'governance'),
  ('when-you-are-old-enough',  'topic', 'daily-life'),
  ('when-you-are-old-enough',  'topic', 'schooling'),
  ('when-you-are-old-enough',  'mode',  'us-contrast'),
  ('how-you-get-a-house',      'topic', 'housing'),
  ('how-you-get-a-house',      'topic', 'work-and-money'),
  ('how-you-get-a-house',      'topic', 'family'),
  ('who-owns-the-roof',        'topic', 'housing'),
  ('who-owns-the-roof',        'topic', 'who-gets-less'),
  ('who-owns-the-roof',        'mode',  'demographics-stat'),
  ('who-owns-the-roof',        'mode',  'us-contrast'),
  ('who-came-and-who-left',    'topic', 'migration'),
  ('who-came-and-who-left',    'topic', 'work-and-money'),
  ('who-they-took-in',         'topic', 'forced-movement'),
  ('who-they-took-in',         'topic', 'migration'),
  ('who-they-took-in',         'topic', 'advocacy'),
  ('where-they-go-when-they-go', 'topic', 'travel'),
  ('where-they-go-when-they-go', 'topic', 'migration'),
  ('where-they-go-when-they-go', 'topic', 'city-life'),
  ('what-a-kid-carries',       'topic', 'daily-life'),
  ('what-a-kid-carries',       'topic', 'schooling'),
  ('what-a-kid-carries',       'mode',  'us-contrast'),
  ('what-they-can-plug-in',    'topic', 'infrastructure'),
  ('what-they-can-plug-in',    'topic', 'daily-life'),
  ('what-they-can-plug-in',    'mode',  'demographics-stat'),
  ('what-they-keep',           'topic', 'animals-with-people'),
  ('what-they-keep',           'topic', 'daily-life'),
  ('what-they-keep',           'topic', 'agriculture'),
  ('street-animals',           'topic', 'animals-with-people'),
  ('street-animals',           'topic', 'city-life'),
  ('street-animals',           'topic', 'daily-life'),
  ('find-them-near-us',        'topic', 'migration'),
  ('find-them-near-us',        'topic', 'everyday-food'),
  ('find-them-near-us',        'mode',  'hands-on'),
  ('find-them-near-us',        'mode',  'personal-voice'),

  ('what-every-kid-learns',    'topic', 'schooling'),
  ('what-every-kid-learns',    'topic', 'family'),
  ('from-school-to-work',     'topic', 'schooling'),
  ('from-school-to-work',     'topic', 'work-and-money'),
  ('from-school-to-work',     'topic', 'milestone'),
  ('first-money-they-earn',   'topic', 'work-and-money'),
  ('first-money-they-earn',   'topic', 'schooling'),
  ('first-money-they-earn',   'topic', 'who-gets-less'),
  ('first-money-they-earn',   'mode',  'us-contrast'),
  ('getting-around-if-you-cant-walk', 'topic', 'who-gets-less'),
  ('getting-around-if-you-cant-walk', 'topic', 'infrastructure'),
  ('getting-around-if-you-cant-walk', 'topic', 'advocacy'),
  ('if-you-get-sick',         'topic', 'health'),
  ('if-you-get-sick',         'topic', 'public-services'),
  ('if-you-get-sick',         'topic', 'who-gets-less'),
  ('if-you-get-sick',         'mode',  'us-contrast'),
  ('what-they-plow-with',     'topic', 'agriculture'),
  ('what-they-plow-with',     'topic', 'crafts'),
  ('what-they-plow-with',     'topic', 'infrastructure'),
  ('where-you-buy-clothes',   'topic', 'clothing'),
  ('where-you-buy-clothes',   'topic', 'city-life'),
  ('where-you-buy-clothes',   'topic', 'work-and-money'),
  ('have-they-been-away',     'topic', 'travel'),
  ('have-they-been-away',     'topic', 'migration'),
  ('have-they-been-away',     'mode',  'demographics-stat'),
  ('have-they-been-away',     'mode',  'us-contrast'),
  ('city-then-and-now',       'topic', 'city-life'),
  ('city-then-and-now',       'topic', 'milestone'),
  ('city-then-and-now',       'topic', 'infrastructure'),

  ('a-whole-name',            'topic', 'names'),
  ('a-whole-name',            'topic', 'language'),
  ('a-whole-name',            'topic', 'family'),
  ('what-they-name-babies-now', 'topic', 'names'),
  ('what-they-name-babies-now', 'topic', 'family'),
  ('what-they-name-babies-now', 'topic', 'daily-life'),
  ('what-they-name-babies-now', 'mode',  'us-contrast'),
  ('their-alphabet',          'topic', 'language'),
  ('their-alphabet',          'topic', 'names'),
  ('their-alphabet',          'topic', 'crafts'),
  ('their-alphabet',          'mode',  'hands-on'),
  ('word-they-have',          'topic', 'language'),
  ('word-they-have',          'topic', 'daily-life'),
  ('ask-for-the-bathroom',    'topic', 'language'),
  ('ask-for-the-bathroom',    'topic', 'travel'),
  ('ask-for-the-bathroom',    'topic', 'daily-life'),
  ('ask-for-the-bathroom',    'mode',  'hands-on'),
  ('what-makes-them-laugh',   'topic', 'language'),
  ('what-makes-them-laugh',   'topic', 'play-and-sport'),
  ('what-makes-them-laugh',   'topic', 'story-telling'),
  ('what-makes-them-laugh',   'mode',  'personal-voice'),

  ('who-worships-what',       'topic', 'religion'),
  ('who-worships-what',       'topic', 'who-gets-less'),
  ('who-worships-what',       'mode',  'demographics-stat'),
  ('when-sabbath-starts',     'topic', 'sabbath'),
  ('when-sabbath-starts',     'topic', 'religion'),
  ('when-sabbath-starts',     'topic', 'sun-and-seasons'),
  ('when-sabbath-starts',     'mode',  'measurement'),
  ('when-sabbath-starts',     'mode',  'us-contrast'),
  ('sun-up-sun-down',         'topic', 'sun-and-seasons'),
  ('sun-up-sun-down',         'topic', 'weather-pattern'),
  ('sun-up-sun-down',         'mode',  'measurement'),
  ('sun-up-sun-down',         'mode',  'us-contrast'),
  ('nations-before-the-throne', 'topic', 'religion'),
  ('nations-before-the-throne', 'topic', 'language'),
  ('nations-before-the-throne', 'mode',  'scripture-read'),
  ('nations-before-the-throne', 'mode',  'personal-voice'),
  ('bible-happened-here',     'topic', 'christian-history'),
  ('bible-happened-here',     'topic', 'story-telling'),
  ('bible-happened-here',     'mode',  'scripture-read'),
  ('creature-they-warn-about', 'topic', 'folklore-belief'),
  ('creature-they-warn-about', 'topic', 'story-telling'),
  ('luck-there',              'topic', 'folklore-belief'),
  ('luck-there',              'topic', 'daily-life'),
  ('luck-there',              'mode',  'us-contrast'),
  ('what-the-old-people-say', 'topic', 'folklore-belief'),
  ('what-the-old-people-say', 'topic', 'health'),
  ('what-the-old-people-say', 'topic', 'family'),
  ('what-the-old-people-say', 'mode',  'personal-voice'),
  ('how-they-remember-the-dead', 'topic', 'folklore-belief'),
  ('how-they-remember-the-dead', 'topic', 'religion'),
  ('how-they-remember-the-dead', 'topic', 'family'),
  ('holidays-through-the-year', 'topic', 'holiday-calendar'),
  ('holidays-through-the-year', 'topic', 'religion'),
  ('holidays-through-the-year', 'topic', 'agriculture'),
  ('same-day-different-name', 'topic', 'holiday-calendar'),
  ('same-day-different-name', 'topic', 'religion'),
  ('same-day-different-name', 'mode',  'us-contrast'),
  ('what-year-is-it-there',  'topic', 'holiday-calendar'),
  ('what-year-is-it-there',  'topic', 'religion'),
  ('what-year-is-it-there',  'topic', 'sun-and-seasons'),
  ('what-year-is-it-there',  'mode',  'measurement'),

  ('how-they-make-it',       'topic', 'crafts'),
  ('how-they-make-it',       'topic', 'trade'),
  ('how-they-make-it',       'topic', 'work-and-money'),
  ('how-they-make-it',       'mode',  'hands-on'),
  ('before-you-visit',       'topic', 'daily-life'),
  ('before-you-visit',       'topic', 'family'),
  ('before-you-visit',       'mode',  'us-contrast'),
  ('school-lunch',           'topic', 'everyday-food'),
  ('school-lunch',           'topic', 'schooling'),
  ('school-lunch',           'topic', 'public-services'),
  ('school-lunch',           'mode',  'us-contrast'),
  ('famous-dish',            'topic', 'celebration-food'),
  ('famous-dish',            'topic', 'story-telling'),
  ('holiday-dish',           'topic', 'celebration-food'),
  ('holiday-dish',           'topic', 'holiday-calendar'),
  ('holiday-dish',           'topic', 'religion'),
  ('something-sweet',        'topic', 'celebration-food'),
  ('something-sweet',        'topic', 'holiday-calendar'),
  ('something-sweet',        'topic', 'agriculture'),
  ('street-food',            'topic', 'everyday-food'),
  ('street-food',            'topic', 'public-money'),
  ('street-food',            'topic', 'city-life'),
  ('drink-with-dinner',      'topic', 'everyday-food'),
  ('drink-with-dinner',      'topic', 'agriculture'),
  ('market-days',            'topic', 'everyday-food'),
  ('market-days',            'topic', 'city-life'),
  ('market-days',            'topic', 'trade'),
  ('grows-better-there',     'topic', 'agriculture'),
  ('grows-better-there',     'topic', 'everyday-food'),
  ('grows-better-there',     'topic', 'trade'),
  ('grows-better-there',     'mode',  'us-contrast'),
  ('hear-from-a-kid',        'topic', 'daily-life'),
  ('hear-from-a-kid',        'topic', 'schooling'),
  ('hear-from-a-kid',        'mode',  'personal-voice'),
  ('what-they-say-about-us', 'topic', 'migration'),
  ('what-they-say-about-us', 'topic', 'travel'),
  ('what-they-say-about-us', 'mode',  'personal-voice'),
  ('what-they-say-about-us', 'mode',  'us-contrast')
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
