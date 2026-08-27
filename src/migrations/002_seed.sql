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
-- Task templates — 27 rows for seed v0, hand-written. See
-- docs/other/SEED-CONTENT.md. 6 in week 1 (4 core + 2 for the fifth slot),
-- 8 in week 2, 8 in week 3, 5 in week 4 for trifold-board only.
--
-- Twenty-seven rather than the twenty in §14: a 5-template week draws all of
-- itself, which leaves Swap with no candidate, and a single project type's
-- week 4 is 5 rows on its own. The block goes here as a single INSERT ...
-- ON CONFLICT (slug) DO NOTHING, with project_type_id read by subselect so the
-- week-4 rows do not depend on an id this file cannot know.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Focus weights — sparse. A missing row means weight 1, so only an opinion is
-- stored: 3 for on-theme, 0 to exclude. Every focus needs at least one 3 in
-- weeks 2-3 or the setup preview has nothing to sample, and at most one 0 per
-- focus per week or a 5-of-8 draw leaves Swap with no candidate.
--
-- The block joins on slugs rather than ids, for the same reason as above.
-- ---------------------------------------------------------------------------
