-- 003_country_data.sql — the hooks, the focus affinities, and the honest
-- adventure levels (DESIGN.md §9).
--
-- A seed, not a migration: re-run by Run seed on every press, and safe to grow.
-- It is separate from 002_seed.sql so the country data can keep growing all
-- year without touching the library.
--
-- Generated once, into this file. No runtime country API, no service to be
-- down, and it works with the wifi off. 93 countries carry hooks; the other
-- 102 stay selectable and unadorned, which is what §9 asks for.
--
-- EVERY HOOK IS A LEAD, NOT A FACT. "Find out what''s carved into the desert at
-- Nazca" — never "The Nazca lines are 2,000 years old." A few hundred hooks
-- written from memory will contain errors, and the phrasing is what decides
-- what an error costs: a lead that is wrong is a dead-end search, and an
-- assertion that is wrong is a false sentence copied into a workbook. It is
-- also the better lesson. The app points; the kid finds.
--
-- Re-running this file cannot duplicate a hook and cannot resurrect a deleted
-- one. `country_hooks` has no unique key to conflict on — a hook is a line of
-- prose, not a keyed row — so the insert is guarded on the country instead: a
-- country that already has any hook is skipped whole. That is the rule that
-- makes the library editor's one delete (Q-14) real, because a hook deleted
-- there stays deleted through every future press. The cost is the other half of
-- the same rule: a hook ADDED to this file for a country already seeded will
-- not land. Add it in the editor, exactly as a corrected task template is.
--
-- The affinities have a real key — (country_id, focus_id) — so they take the
-- ordinary ON CONFLICT DO NOTHING, and a reason reworded in the editor survives.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Hooks — 2 or 3 a country, the sentence that makes a kid stop scrolling.
-- Position orders them on the country card; position 1 is the line the picker
-- shows, so it is the strongest of the two or three.
-- ---------------------------------------------------------------------------
INSERT INTO country_hooks (country_id, text, position)
SELECT c.id, v.text, v.position
FROM (
  SELECT NULL AS iso3, NULL AS text, NULL AS position
  WHERE 0
  UNION ALL VALUES
-- BEGIN country_hooks
('EGY', 'Find out what is buried under the sand at Saqqara that is older than the pyramids at Giza', 1),
  ('EGY', 'Look up how a temple as big as Abu Simbel was cut up and moved to higher ground', 2),
  ('EGY', 'Find out what the Nile used to do every summer, and what was built to stop it', 3),
  ('ETH', 'Find out how the churches at Lalibela were built downward into the rock instead of up', 1),
  ('ETH', 'Look up why the Ethiopian calendar says it is a different year than yours', 2),
  ('ETH', 'Find out which two days Ethiopian Christians have kept as rest days for centuries', 3),
  ('KEN', 'Find out what the Great Rift Valley is slowly doing to Kenya', 1),
  ('KEN', 'Look up what turns Lake Nakuru pink some years and not others', 2),
  ('KEN', 'Find out how old the oldest human bones dug up at Koobi Fora are', 3),
  ('TZA', 'Find out whose footprints were preserved in volcanic ash at Laetoli', 1),
  ('TZA', 'Look up why Ngorongoro is a crater full of animals instead of a lake', 2),
  ('MAR', 'Find out what is soaking in the round pits of the Fes tanneries, and what they smell like', 1),
  ('MAR', 'Look up why the town of Chefchaouen is painted blue', 2),
  ('MAR', 'Find out how long it takes to cross the dunes at Merzouga by camel', 3),
  ('ZAF', 'Find out what keeps coming out of the caves at the Cradle of Humankind', 1),
  ('ZAF', 'Look up why Cape Town says its mountain puts on a tablecloth', 2),
  ('ZAF', 'Find out what Robben Island was used for before it became a museum', 3),
  ('NGA', 'Find out what the Nok people were making out of clay two thousand years ago', 1),
  ('NGA', 'Look up how many films Nollywood puts out in a year, and how that compares to Hollywood', 2),
  ('GHA', 'Find out what the castles along Ghana''s coast were built to hold', 1),
  ('GHA', 'Look up what the patterns woven into kente cloth are saying', 2),
  ('MLI', 'Find out what a mosque built out of mud needs the whole town to do every single year', 1),
  ('MLI', 'Look up how many old handwritten books families in Timbuktu have been hiding', 2),
  ('NAM', 'Find out why the trees at Deadvlei are still standing hundreds of years after they died', 1),
  ('NAM', 'Look up what the Skeleton Coast is named after', 2),
  ('MDG', 'Find out how many of Madagascar''s animals live nowhere else on earth', 1),
  ('MDG', 'Look up what a baobab keeps inside its trunk', 2),
  ('BWA', 'Find out where the Okavango River ends up, since it never reaches the sea', 1),
  ('BWA', 'Look up what fills the Kalahari with animals for a few weeks a year', 2),
  ('SEN', 'Find out what makes Lake Retba pink and what people pull out of it all day', 1),
  ('SEN', 'Look up what the Great Green Wall is being planted to stop', 2),
  ('ZWE', 'Find out who stacked the walls at Great Zimbabwe without any mortar', 1),
  ('ZWE', 'Look up what the local name for Victoria Falls means', 2),
  ('RWA', 'Find out how many mountain gorillas are left and who counts them', 1),
  ('RWA', 'Look up what the whole country does together on the last Saturday of the month', 2),
  ('COD', 'Find out what is boiling inside the crater at Nyiragongo', 1),
  ('COD', 'Look up what an okapi is and how long it stayed hidden from scientists', 2),
  ('SDN', 'Find out how many pyramids are standing in Sudan, then compare that to Egypt', 1),
  ('SDN', 'Look up what the kingdom of Kush ruled, and for how long', 2),
  ('TUN', 'Find out what Rome did to Carthage, and what is left of it now', 1),
  ('TUN', 'Look up which Tunisian desert town got used as another planet in a film', 2),
  ('UGA', 'Find out where the Nile actually starts', 1),
  ('UGA', 'Look up why the Rwenzori range is called the Mountains of the Moon', 2),
  ('JPN', 'Find out what happens to a bullet train the instant an earthquake starts', 1),
  ('JPN', 'Look up why some broken Japanese bowls are repaired with gold instead of glue', 2),
  ('JPN', 'Find out how many active volcanoes Japan is sitting on top of', 3),
  ('CHN', 'Find out who found the terracotta army, and what they were digging for', 1),
  ('CHN', 'Look up how much of China is desert, and which direction that desert is moving', 2),
  ('CHN', 'Find out what a Chinese character looked like when it was first scratched onto bone', 3),
  ('IND', 'Find out what the stepwells of Rajasthan were dug down into the ground for', 1),
  ('IND', 'Look up how the bridges in Meghalaya are grown instead of built', 2),
  ('IND', 'Find out how many languages are printed on a single Indian banknote', 3),
  ('MNG', 'Find out how fast a family can take down a ger and load it up', 1),
  ('MNG', 'Look up why Mongolian eagle hunters fly female eagles and not males', 2),
  ('MNG', 'Find out where the first dinosaur eggs anyone had ever seen were dug up', 3),
  ('NPL', 'Find out how much taller Everest gets every year, and what is pushing it', 1),
  ('NPL', 'Look up how much weight a Sherpa carries up the mountain, and for how long', 2),
  ('ISR', 'Find out why nothing sinks in the Dead Sea, and why the shoreline keeps moving', 1),
  ('ISR', 'Look up what a shepherd boy found in a cave at Qumran, and how old it turned out to be', 2),
  ('ISR', 'Find out what happens to the buses, shops and roads there from Friday sunset to Saturday sunset', 3),
  ('JOR', 'Find out how Petra was carved, and where a city in a desert canyon got its water', 1),
  ('JOR', 'Look up what was filmed in Wadi Rum because it looks like somewhere else', 2),
  ('JOR', 'Find out what you can see from the top of Mount Nebo on a clear day', 3),
  ('TUR', 'Find out what is carved on the pillars at Gobekli Tepe and how old they are', 1),
  ('TUR', 'Look up how deep the underground city at Derinkuyu goes and how many people it held', 2),
  ('TUR', 'Find out which seven cities in Turkey get letters written to them in Revelation', 3),
  ('IRN', 'Find out what a qanat is and how far underground the water travels in one', 1),
  ('IRN', 'Look up what Cyrus had written on a clay cylinder that now sits in a museum in London', 2),
  ('IRQ', 'Find out what was written on the clay tablets dug out of the library at Nineveh', 1),
  ('IRQ', 'Look up who lives in the marshes of southern Iraq, and what happened to their water', 2),
  ('IRQ', 'Find out what is left standing of Babylon', 3),
  ('SAU', 'Find out who cut the tombs at Hegra into the rock, and what happened to them', 1),
  ('SAU', 'Look up how a city moves two million visitors through it in five days', 2),
  ('KOR', 'Find out what has quietly moved into the strip of land between the two Koreas', 1),
  ('KOR', 'Look up who invented the Korean alphabet on purpose, and what he wanted it to do', 2),
  ('VNM', 'Find out how big the cave at Son Doong is, and what is growing inside it', 1),
  ('VNM', 'Look up how a mountainside gets turned into stairs for growing rice', 2),
  ('THA', 'Find out what the market at Maeklong has to do eight times a day', 1),
  ('THA', 'Look up how long the reclining Buddha in Bangkok is', 2),
  ('IDN', 'Find out how many islands Indonesia has, and how many of them have people living on them', 1),
  ('IDN', 'Look up how far away Krakatoa was heard in 1883', 2),
  ('IDN', 'Find out what the carvings at Borobudur are arranged in order to teach', 3),
  ('PHL', 'Find out how old the rice terraces at Banaue are and who repairs them', 1),
  ('PHL', 'Look up what a jeepney started life as', 2),
  ('KHM', 'Find out what the sun does behind Angkor Wat on one particular morning each year', 1),
  ('KHM', 'Look up what the jungle has done to the temple at Ta Prohm', 2),
  ('LKA', 'Find out what is on top of the rock at Sigiriya and how anyone gets up there', 1),
  ('LKA', 'Look up how Sri Lanka''s ancient tanks moved water across the island without pumps', 2),
  ('KAZ', 'Find out where the ships of the Aral Sea are sitting now', 1),
  ('KAZ', 'Look up what gets launched from Baikonur and who launches it', 2),
  ('UZB', 'Find out what was bought and sold in Samarkand, and who was passing through', 1),
  ('UZB', 'Look up how the tiles on the Registan were made that blue', 2),
  ('BTN', 'Find out what Bhutan measures instead of only counting money', 1),
  ('BTN', 'Look up how the monastery at Paro Taktsang stays on the side of a cliff', 2),
  ('LBN', 'Find out how heavy the cut stones at Baalbek are, and why nobody is sure how they were moved', 1),
  ('LBN', 'Look up how old the oldest cedars of Lebanon are and how many are left', 2),
  ('SYR', 'Find out what a whole Roman city was doing out in the desert at Palmyra', 1),
  ('SYR', 'Look up how long people have lived in Damascus without ever stopping', 2),
  ('YEM', 'Find out why the mud towers at Shibam get called the oldest skyscrapers', 1),
  ('YEM', 'Look up what a dragon''s blood tree on Socotra looks like, and what is inside it', 2),
  ('PSE', 'Find out how old the walls found at Jericho are', 1),
  ('PSE', 'Look up how the hillsides around Bethlehem are cut into steps for olive trees', 2),
  ('PAK', 'Find out what the drains and baths under Mohenjo-daro tell you about who lived there', 1),
  ('PAK', 'Look up why more climbers come back down from Everest than from K2', 2),
  ('ISL', 'Find out where Iceland is splitting in two, and how fast the two halves are moving apart', 1),
  ('ISL', 'Look up how Iceland heats its houses without burning anything', 2),
  ('ISL', 'Find out what one Icelandic volcano did to every airport in Europe in 2010', 3),
  ('NOR', 'Find out how deep the Sognefjord is and what carved it out', 1),
  ('NOR', 'Look up how many days in a row the sun stays up in Tromso in summer', 2),
  ('GBR', 'Find out how the biggest stones at Stonehenge got there from Wales', 1),
  ('GBR', 'Look up what is written on the Rosetta Stone, and how it unlocked a whole language', 2),
  ('IRL', 'Find out what lines up with the sunrise at Newgrange, and on which morning of the year', 1),
  ('IRL', 'Look up how many birds nest on the Cliffs of Moher and what they are doing there', 2),
  ('FRA', 'Find out who found the painted cave at Lascaux, and how old the paintings are', 1),
  ('FRA', 'Look up how Mont-Saint-Michel becomes an island twice a day', 2),
  ('ESP', 'Find out how long the cathedral in Barcelona has been under construction, and when they think it will be done', 1),
  ('ESP', 'Look up what is painted on the ceiling of the cave at Altamira, and who noticed it first', 2),
  ('PRT', 'Find out what Portuguese sailors were looking for when they set out from Lisbon', 1),
  ('PRT', 'Look up how cork is stripped off a tree without killing the tree', 2),
  ('ITA', 'Find out what got preserved at Pompeii, and how it was preserved', 1),
  ('ITA', 'Look up why Venice floods, and what the city built to try to stop it', 2),
  ('ITA', 'Find out what people keep finding under the streets of Rome when they dig', 3),
  ('GRC', 'Find out what the machine pulled out of the sea at Antikythera turned out to do', 1),
  ('GRC', 'Look up how a whisper on the stage at Epidaurus reaches the back row', 2),
  ('DEU', 'Find out what Gutenberg''s press changed, and how quickly it spread', 1),
  ('DEU', 'Look up why a castle like Neuschwanstein was built long after castles stopped being useful', 2),
  ('NLD', 'Find out how much of the Netherlands sits below sea level and what is holding the water back', 1),
  ('NLD', 'Look up how the Dutch turned a whole sea into farmland', 2),
  ('CHE', 'Find out how long the rail tunnel under the Gotthard is, and how long it took to dig', 1),
  ('CHE', 'Look up what Switzerland keeps stored inside its mountains', 2),
  ('POL', 'Find out what has been carved out of the salt under Wieliczka, including a whole chapel', 1),
  ('POL', 'Look up what happened to Warsaw''s old town, and how it got put back', 2),
  ('CZE', 'Find out everything the astronomical clock in Prague shows besides the time', 1),
  ('CZE', 'Look up how Bohemian glassmakers get their colours', 2),
  ('UKR', 'Find out what grows in Ukraine''s black soil, and who eats it', 1),
  ('UKR', 'Look up what animals are living in the forest around Chernobyl now', 2),
  ('RUS', 'Find out how many days the Trans-Siberian takes end to end, and how many time zones it crosses', 1),
  ('RUS', 'Look up how deep Lake Baikal is and what lives in it that lives nowhere else', 2),
  ('FIN', 'Find out how many lakes Finland has, then find out how many islands', 1),
  ('FIN', 'Look up what a Finnish family does in a sauna besides get warm', 2),
  ('SWE', 'Find out why the warship Vasa sank, and what it looks like now it has been raised', 1),
  ('SWE', 'Look up what happens to the ice hotel every summer', 2),
  ('MLT', 'Find out how much older the temples at Ggantija are than the pyramids', 1),
  ('MLT', 'Look up where Paul was shipwrecked on his way to Rome, and what happened after he got ashore', 2),
  ('USA', 'Find out how long the Colorado River took to cut the Grand Canyon', 1),
  ('USA', 'Look up what the cliff houses at Mesa Verde were built into, and why people left', 2),
  ('USA', 'Find out how many people came through Ellis Island, and where most of them came from', 3),
  ('CAN', 'Find out how far the water rises and falls at the Bay of Fundy twice a day', 1),
  ('CAN', 'Look up who built the turf houses at L''Anse aux Meadows five hundred years before Columbus', 2),
  ('MEX', 'Find out what the shadow does on the pyramid at Chichen Itza at the equinox', 1),
  ('MEX', 'Look up where the monarch butterflies from Canada spend the winter, and how they find it', 2),
  ('MEX', 'Find out what a cenote is and what the Maya used them for', 3),
  ('GTM', 'Find out how many buildings are still buried under the hills around Tikal', 1),
  ('GTM', 'Look up what the pattern on a Guatemalan huipil tells you about the person wearing it', 2),
  ('CUB', 'Find out why so many 1950s American cars are still running in Havana', 1),
  ('CUB', 'Look up how much of Havana''s vegetables are grown inside the city', 2),
  ('JAM', 'Find out how high up the Blue Mountains the coffee is grown', 1),
  ('JAM', 'Look up how a country of three million people keeps producing the fastest sprinters alive', 2),
  ('HTI', 'Find out who built the fortress at Citadelle Laferriere, and what they were expecting', 1),
  ('HTI', 'Look up what happened to Haiti''s forests, and what people are planting now', 2),
  ('CRI', 'Find out what Costa Rica did with its army in 1948', 1),
  ('CRI', 'Look up how much of the country''s electricity comes from rain, wind and volcanoes', 2),
  ('PAN', 'Find out how a ship gets lifted twenty-six metres uphill to cross Panama', 1),
  ('PAN', 'Look up what scientists have been studying on the island in the middle of the canal', 2),
  ('BLZ', 'Find out how deep the Blue Hole is and what divers find at the bottom', 1),
  ('BLZ', 'Look up how far the reef off Belize runs, and what that makes it', 2),
  ('DOM', 'Find out where amber with insects trapped inside it is mined', 1),
  ('DOM', 'Look up what is left of the first Spanish city built in the Americas', 2),
  ('PER', 'Find out what is carved into the desert at Nazca that you can only see from the air', 1),
  ('PER', 'Look up how the Inca fitted stones together so tightly a knife blade will not go in', 2),
  ('PER', 'Find out how a quipu kept count of things without any writing', 3),
  ('BOL', 'Find out which Bolivian salt flat satellites point at to calibrate their cameras', 1),
  ('BOL', 'Look up what Uyuni turns into when it rains', 2),
  ('BOL', 'Find out how high La Paz is, and what visiting football teams say about playing there', 3),
  ('CHL', 'Find out how long it has been since rain fell in parts of the Atacama', 1),
  ('CHL', 'Look up who carved the moai on Easter Island and how they were moved', 2),
  ('ARG', 'Find out how many separate waterfalls make up Iguazu', 1),
  ('ARG', 'Look up what a gaucho does all day out on the pampas', 2),
  ('BRA', 'Find out how much of the world''s fresh river water comes down the Amazon', 1),
  ('BRA', 'Look up why two rivers meeting at Manaus refuse to mix for miles', 2),
  ('BRA', 'Find out how big a Carnival float gets, and how long one takes to build', 3),
  ('COL', 'Find out what colours the river Cano Cristales turns, and the weeks it does it', 1),
  ('COL', 'Look up what has been carved inside the salt mine at Zipaquira', 2),
  ('ECU', 'Find out how the same kind of animal ended up different on each Galapagos island', 1),
  ('ECU', 'Look up which mountain top is furthest from the centre of the earth, and why it is not Everest', 2),
  ('VEN', 'Find out how far water falls at Angel Falls before it turns into mist', 1),
  ('VEN', 'Look up how many nights a year lightning strikes over Lake Maracaibo', 2),
  ('PRY', 'Find out what the orchestra at Cateura makes its violins and cellos out of', 1),
  ('PRY', 'Look up which two languages people in Paraguay speak at the same time', 2),
  ('URY', 'Find out how much of Uruguay''s electricity comes from wind', 1),
  ('URY', 'Look up how many cows there are in Uruguay for every person', 2),
  ('AUS', 'Find out how far the Great Barrier Reef runs, and what is turning it white', 1),
  ('AUS', 'Look up how old the rock art in Kakadu is, and who is still painting it', 2),
  ('AUS', 'Find out how long the dingo fence is and what it was built to keep out', 3),
  ('NZL', 'Find out what a kiwi has instead of wings, and where it keeps its nostrils', 1),
  ('NZL', 'Look up what makes the ground at Rotorua steam and smell', 2),
  ('PNG', 'Find out how many languages are spoken in Papua New Guinea', 1),
  ('PNG', 'Look up what a bird of paradise does when it is trying to impress somebody', 2),
  ('FJI', 'Find out how a lovo cooks a whole meal underground', 1),
  ('FJI', 'Look up how Pacific navigators crossed open ocean with no instruments at all', 2),
  ('TON', 'Find out which Pacific kingdom was never taken over by anybody', 1),
  ('TON', 'Look up what the volcano at Hunga Tonga did to the sky in 2022', 2),
  ('WSM', 'Find out what a Samoan fale is built without', 1),
  ('WSM', 'Look up why Samoa skipped a whole day in 2011', 2),
  ('TUV', 'Find out how high the highest point in Tuvalu is', 1),
  ('TUV', 'Look up what Tuvalu earns from owning the .tv internet address', 2),
  ('TCD', 'Find out how much smaller Lake Chad is now than when your grandparents were born', 1),
  ('TCD', 'Look up what is painted on the rock walls of the Ennedi, out in the desert', 2),
  ('LSO', 'Find out how much of Lesotho sits higher up than the highest point in England', 1),
  ('LSO', 'Look up when it snows in Lesotho, and what herders wear because of it', 2),
  ('NER', 'Find out what kind of dinosaur keeps coming out of the sand in the Tenere', 1),
  ('NER', 'Look up what the mud minaret at Agadez has sticking out of it, and why', 2),
  ('DJI', 'Find out how far below sea level Lake Assal sits, and why it is saltier than the sea', 1),
  ('DJI', 'Look up what three tectonic plates are doing to each other under Djibouti', 2),
  ('KGZ', 'Find out what a family takes with them up to the high pastures for the summer', 1),
  ('KGZ', 'Look up what grows in the walnut forest at Arslanbob and who picks it', 2),
  ('VUT', 'Find out what land diving on Pentecost Island is, and what sport was invented from watching it', 1),
  ('VUT', 'Look up how close to an active volcano people live on Tanna', 2),
  ('PLW', 'Find out what happened to the stingers of the jellyfish in Palau''s lake', 1),
  ('PLW', 'Look up how much of its own ocean Palau closed to fishing', 2),
  ('GUY', 'Find out how far the water drops at Kaieteur in one go', 1),
  ('GUY', 'Look up how much of Guyana is still forest nobody has cut', 2)
-- END country_hooks
) v
JOIN countries c ON c.iso3 = v.iso3
WHERE NOT EXISTS (SELECT 1 FROM country_hooks h WHERE h.country_id = c.id);

-- ---------------------------------------------------------------------------
-- Focus affinities — 2 or 3 a country, and only recommendations: a 3 is an
-- exceptional fit, a 2 is a good one, and no row at all means neutral. There is
-- no way to say "bad fit" and there should not be, because the kid is allowed
-- to pick any focus for any country and the app's job is to say what is good
-- about the choice, not to argue with it.
--
-- The reason is the whole value of the row. "Egypt + ancient-world" tells a kid
-- nothing; "you'll have more to draw than fits on the page" tells them what the
-- month will feel like. It is shown under the focus on the setup screen, so it
-- is written to be read out loud in one breath.
--
-- Affinity never touches the draw (§9). It ranks and explains at pick time and
-- stops there — a country and a focus stay independent, which is what lets a
-- kid change countries halfway through a month without the plan making no
-- sense.
-- ---------------------------------------------------------------------------
INSERT INTO country_focus_affinity (country_id, focus_id, score, reason)
SELECT c.id, f.id, v.score, v.reason
FROM (
  SELECT NULL AS iso3, NULL AS focus, NULL AS score, NULL AS reason
  WHERE 0
  UNION ALL VALUES
-- BEGIN country_focus_affinity
  ('EGY', 'ancient-world',       3, 'you''ll have more to draw than fits on the page'),
  ('EGY', 'land-and-sky',        2, 'one river decides where every single person lives'),
  ('ETH', 'ancient-world',       3, 'churches cut downward into rock, and a calendar that disagrees with yours'),
  ('ETH', 'people-and-power',    2, 'the one country in Africa that nobody managed to hold'),
  ('KEN', 'wild-places',         3, 'the animals are why people come, and every one of them is findable'),
  ('KEN', 'land-and-sky',        2, 'the ground is splitting open along the Rift Valley'),
  ('TZA', 'wild-places',         3, 'a crater full of animals and a plain full of footprints'),
  ('TZA', 'ancient-world',       2, 'some of the oldest human tracks anywhere on earth'),
  ('MAR', 'food-and-craft',      3, 'tanneries, markets and tiled patterns you can copy'),
  ('MAR', 'land-and-sky',        2, 'snow on the mountains and the Sahara out the other side'),
  ('ZAF', 'conflict-and-change', 3, 'a country that changed its own rules and wrote down how'),
  ('ZAF', 'ancient-world',       2, 'caves that keep handing over older and older bones'),
  ('NGA', 'people-and-power',    2, 'more people than any other country in Africa, and a film industry to match'),
  ('NGA', 'food-and-craft',      2, 'clay heads two thousand years old, and cloth worth drawing'),
  ('GHA', 'conflict-and-change', 3, 'the first in Africa to take its independence, and everyone was watching'),
  ('GHA', 'food-and-craft',      2, 'kente patterns actually say things, and you can copy one'),
  ('MLI', 'ancient-world',       3, 'mud mosques and libraries of handwritten books'),
  ('MLI', 'food-and-craft',      2, 'a building the whole town re-plasters by hand every year'),
  ('NAM', 'land-and-sky',        3, 'dunes, dead trees and the emptiest sky you will find'),
  ('NAM', 'wild-places',         2, 'desert animals that should not be able to live there'),
  ('MDG', 'wild-places',         3, 'half of what lives there lives nowhere else on earth'),
  ('MDG', 'land-and-sky',        2, 'an island that broke off and went its own way'),
  ('BWA', 'wild-places',         3, 'a river that floods a desert instead of reaching the sea'),
  ('BWA', 'land-and-sky',        2, 'the water arrives from rain that fell in another country'),
  ('SEN', 'food-and-craft',      2, 'a pink lake people harvest salt out of by hand'),
  ('SEN', 'land-and-sky',        2, 'a wall of trees being planted right across the continent'),
  ('ZWE', 'ancient-world',       3, 'stone walls built with no mortar, and nobody agrees how'),
  ('ZWE', 'wild-places',         2, 'the falls make their own weather'),
  ('RWA', 'wild-places',         3, 'gorillas rare enough to be counted one at a time'),
  ('RWA', 'people-and-power',    2, 'a country that rebuilt itself on purpose'),
  ('COD', 'wild-places',         3, 'a lake of lava, and an animal nobody believed in'),
  ('COD', 'land-and-sky',        2, 'the second biggest rainforest on earth'),
  ('SDN', 'ancient-world',       3, 'more pyramids than Egypt has, and hardly anyone knows'),
  ('SDN', 'conflict-and-change', 2, 'a country that split in two while you were alive'),
  ('TUN', 'ancient-world',       3, 'Carthage lost a war so badly the city became a lesson'),
  ('TUN', 'conflict-and-change', 2, 'a protest here set off a decade of change'),
  ('UGA', 'wild-places',         2, 'the Nile starts here and the Mountains of the Moon are behind it'),
  ('UGA', 'land-and-sky',        2, 'snow on the equator, if you climb high enough'),
  ('JPN', 'land-and-sky',        3, 'volcanoes and earthquakes, and a country built for both'),
  ('JPN', 'food-and-craft',      3, 'everything there is made carefully, which makes it worth drawing'),
  ('CHN', 'ancient-world',       3, 'an army made of clay and writing older than most countries'),
  ('CHN', 'people-and-power',    2, 'the most people any government has ever tried to run at once'),
  ('IND', 'food-and-craft',      3, 'food, cloth and buildings, and all of it worth copying'),
  ('IND', 'people-and-power',    2, 'more languages on one banknote than you can count'),
  ('MNG', 'wild-places',         3, 'a house you can pack onto a cart, and eagles that hunt for you'),
  ('MNG', 'ancient-world',       2, 'the empire that got further on horseback than anyone since'),
  ('NPL', 'land-and-sky',        3, 'the tallest mountain on earth, and it is still growing'),
  ('NPL', 'wild-places',         2, 'jungle to ice in one day''s drive'),
  ('ISR', 'ancient-world',       3, 'you will find more here than you can fit into one month'),
  ('ISR', 'conflict-and-change', 3, 'these borders have moved in your parents'' lifetime'),
  ('JOR', 'ancient-world',       3, 'a whole city carved into the wall of a canyon'),
  ('JOR', 'land-and-sky',        2, 'red desert on one side, the lowest place on land on the other'),
  ('TUR', 'ancient-world',       3, 'the oldest carved pillars anybody has ever found'),
  ('TUR', 'conflict-and-change', 2, 'a country sitting on the seam between two continents'),
  ('IRN', 'ancient-world',       3, 'an empire that wrote its rules down on clay and kept them'),
  ('IRN', 'land-and-sky',        2, 'water moved for miles underground to keep a desert alive'),
  ('IRQ', 'ancient-world',       3, 'writing, cities and libraries all started around here'),
  ('IRQ', 'conflict-and-change', 3, 'the same ground has been fought over for four thousand years'),
  ('SAU', 'ancient-world',       2, 'tombs cut into rock in the middle of nowhere'),
  ('SAU', 'people-and-power',    2, 'a country built on what turned out to be under the sand'),
  ('KOR', 'conflict-and-change', 3, 'one people, two countries, and a line neither can cross'),
  ('KOR', 'people-and-power',    2, 'an alphabet invented on purpose so ordinary people could read'),
  ('VNM', 'food-and-craft',      3, 'rice terraces and food worth drawing before you eat it'),
  ('VNM', 'land-and-sky',        2, 'caves big enough to have weather inside them'),
  ('THA', 'food-and-craft',      3, 'markets, temples and food on every corner'),
  ('THA', 'wild-places',         2, 'jungle, elephants and a coastline'),
  ('IDN', 'land-and-sky',        3, 'volcanoes strung out across thousands of islands'),
  ('IDN', 'wild-places',         2, 'the animals change halfway across, along an invisible line'),
  ('PHL', 'wild-places',         2, 'seven thousand islands and the reefs in between'),
  ('PHL', 'food-and-craft',      2, 'terraces carved into mountains by hand two thousand years ago'),
  ('KHM', 'ancient-world',       3, 'the biggest religious building ever put up'),
  ('KHM', 'wild-places',         2, 'the jungle is quietly taking some of it back'),
  ('LKA', 'ancient-world',       2, 'a king''s palace on the top of a rock'),
  ('LKA', 'land-and-sky',        2, 'ancient tanks that moved water across an island without pumps'),
  ('KAZ', 'conflict-and-change', 3, 'an entire sea vanished and you can go and see where'),
  ('KAZ', 'land-and-sky',        2, 'rockets go up from the middle of the steppe'),
  ('UZB', 'ancient-world',       3, 'the Silk Road stopped here and left buildings behind'),
  ('UZB', 'food-and-craft',      2, 'blue tiles with patterns you can copy'),
  ('BTN', 'people-and-power',    3, 'a country that measures happiness on purpose'),
  ('BTN', 'land-and-sky',        2, 'monasteries stuck to the sides of cliffs'),
  ('LBN', 'ancient-world',       3, 'stones so big nobody agrees how they were moved'),
  ('LBN', 'food-and-craft',      2, 'cedars in the mountains and food worth writing about'),
  ('SYR', 'ancient-world',       3, 'a Roman city standing out in the desert'),
  ('SYR', 'conflict-and-change', 3, 'much of what you find will be recent, and hard'),
  ('YEM', 'ancient-world',       2, 'mud towers that have stood for five hundred years'),
  ('YEM', 'wild-places',         2, 'an island of trees that look like something invented'),
  ('PSE', 'ancient-world',       3, 'some of the oldest walls anybody has dug up'),
  ('PSE', 'conflict-and-change', 3, 'the map here has changed inside living memory'),
  ('PAK', 'ancient-world',       3, 'a city with proper drains four thousand years ago'),
  ('PAK', 'land-and-sky',        2, 'the mountain that climbers are most afraid of'),
  ('ISL', 'land-and-sky',        3, 'the ground is still being built'),
  ('ISL', 'wild-places',         2, 'almost no trees, and geysers instead'),
  ('NOR', 'land-and-sky',        3, 'fjords cut a mile deep, and a sun that will not set'),
  ('NOR', 'wild-places',         2, 'the coastline goes on far longer than it looks'),
  ('GBR', 'people-and-power',    3, 'a lot of the world''s rules got argued out here first'),
  ('GBR', 'ancient-world',       2, 'stones dragged from Wales for reasons nobody knows'),
  ('IRL', 'ancient-world',       3, 'a tomb older than the pyramids, lined up with one sunrise'),
  ('IRL', 'land-and-sky',        2, 'cliffs, rain, and green because of the rain'),
  ('FRA', 'ancient-world',       3, 'painted caves, and an abbey that becomes an island twice a day'),
  ('FRA', 'food-and-craft',      3, 'bread, cheese and buildings, all made on purpose'),
  ('ESP', 'food-and-craft',      3, 'a cathedral still being built by hand after 140 years'),
  ('ESP', 'ancient-world',       2, 'cave paintings that a child spotted first'),
  ('PRT', 'conflict-and-change', 3, 'sailors from here redrew everybody else''s map'),
  ('PRT', 'food-and-craft',      2, 'cork, painted tiles and fish'),
  ('ITA', 'ancient-world',       3, 'a whole town preserved by a volcano'),
  ('ITA', 'food-and-craft',      3, 'food, art and building, and all of it drawable'),
  ('GRC', 'ancient-world',       3, 'theatres, temples, and a computer made out of bronze'),
  ('GRC', 'people-and-power',    3, 'voting was invented here, and it did not work like yours'),
  ('DEU', 'conflict-and-change', 3, 'a country cut in half and put back together in living memory'),
  ('DEU', 'people-and-power',    2, 'a printing press changed who was allowed to know things'),
  ('NLD', 'land-and-sky',        3, 'the land is below the sea and the sea is kept out on purpose'),
  ('NLD', 'people-and-power',    2, 'a country that has to agree about water or drown'),
  ('CHE', 'land-and-sky',        3, 'mountains they gave up going over and tunnelled through'),
  ('CHE', 'people-and-power',    2, 'everybody votes on everything, several times a year'),
  ('POL', 'conflict-and-change', 3, 'a city flattened, then rebuilt from paintings'),
  ('POL', 'food-and-craft',      2, 'a cathedral carved out of solid salt'),
  ('CZE', 'food-and-craft',      3, 'glass, clocks and things made by hand'),
  ('CZE', 'ancient-world',       2, 'a clock that has been running since the 1400s'),
  ('UKR', 'conflict-and-change', 3, 'these borders are moving right now, while you research them'),
  ('UKR', 'food-and-craft',      2, 'black soil that grows bread for other countries'),
  ('RUS', 'land-and-sky',        3, 'eleven time zones and the deepest lake on earth'),
  ('RUS', 'conflict-and-change', 2, 'this map has been redrawn more than once'),
  ('FIN', 'wild-places',         3, 'more lakes than anyone has properly counted, and forest between them'),
  ('FIN', 'land-and-sky',        2, 'the sky puts on lights all winter'),
  ('SWE', 'ancient-world',       2, 'a warship raised whole out of the harbour mud'),
  ('SWE', 'food-and-craft',      2, 'a hotel rebuilt out of ice every single year'),
  ('MLT', 'ancient-world',       3, 'temples older than the pyramids on an island you can drive across'),
  ('MLT', 'conflict-and-change', 2, 'everybody who ever sailed past tried to hold it'),
  ('USA', 'land-and-sky',        3, 'a canyon a mile deep, and every kind of weather at once'),
  ('USA', 'conflict-and-change', 2, 'a country that argues about itself out loud and in public'),
  ('CAN', 'wild-places',         3, 'more forest and lake than there are people'),
  ('CAN', 'land-and-sky',        2, 'tides that rise higher than a house, twice a day'),
  ('MEX', 'ancient-world',       3, 'pyramids that do tricks with the sun on the right morning'),
  ('MEX', 'food-and-craft',      3, 'food, cloth and colour in every direction'),
  ('GTM', 'ancient-world',       3, 'a Maya city the jungle swallowed and is still holding'),
  ('GTM', 'food-and-craft',      2, 'weaving that tells you which village somebody is from'),
  ('CUB', 'conflict-and-change', 3, 'a country that got cut off and had to fix everything itself'),
  ('CUB', 'food-and-craft',      2, 'cars kept running for seventy years with no parts'),
  ('JAM', 'people-and-power',    2, 'a small island that keeps beating much bigger ones'),
  ('JAM', 'food-and-craft',      2, 'coffee grown high in the mountains, and a whole kind of music'),
  ('HTI', 'conflict-and-change', 3, 'the only country ever started by people who freed themselves'),
  ('HTI', 'land-and-sky',        2, 'the forests went, and then the soil went with the rain'),
  ('CRI', 'wild-places',         3, 'more kinds of living thing per acre than nearly anywhere'),
  ('CRI', 'people-and-power',    2, 'a country that got rid of its own army'),
  ('PAN', 'land-and-sky',        3, 'ships get lifted over a mountain range'),
  ('PAN', 'wild-places',         2, 'the forest either side of the canal is watched constantly'),
  ('BLZ', 'wild-places',         3, 'a reef, a blue hole, and jungle behind both'),
  ('BLZ', 'ancient-world',       2, 'Maya cities still under the trees'),
  ('DOM', 'ancient-world',       2, 'the first Spanish city in the Americas is still standing'),
  ('DOM', 'land-and-sky',        2, 'amber with insects still inside it comes out of these hills'),
  ('PER', 'ancient-world',       3, 'you''ll have more to draw than fits on the page'),
  ('PER', 'land-and-sky',        3, 'desert, mountains and jungle in the same country'),
  ('BOL', 'land-and-sky',        3, 'a salt flat that turns into a mirror the size of a state'),
  ('BOL', 'ancient-world',       2, 'cities built higher than people are supposed to live'),
  ('CHL', 'land-and-sky',        3, 'the driest desert on earth and the clearest sky for telescopes'),
  ('CHL', 'wild-places',         2, 'four thousand kilometres of coast and almost no width'),
  ('ARG', 'wild-places',         3, 'waterfalls, glaciers, and grass to the horizon'),
  ('ARG', 'food-and-craft',      2, 'cattle, leather, and a country that cooks outdoors'),
  ('BRA', 'wild-places',         3, 'the biggest rainforest and the biggest river, in one place'),
  ('BRA', 'food-and-craft',      3, 'costumes built all year for five days of Carnival'),
  ('COL', 'wild-places',         3, 'a river that turns five colours for a few weeks'),
  ('COL', 'land-and-sky',        2, 'mountains, coast and jungle all at once'),
  ('ECU', 'wild-places',         3, 'the islands that changed how everyone thinks about animals'),
  ('ECU', 'land-and-sky',        3, 'the equator, a volcano, and the bulge of the earth'),
  ('VEN', 'land-and-sky',        3, 'the tallest waterfall there is, and lightning nearly every night'),
  ('VEN', 'wild-places',         2, 'flat-topped mountains with their own species on top'),
  ('PRY', 'food-and-craft',      3, 'an entire orchestra built out of rubbish'),
  ('PRY', 'people-and-power',    2, 'nearly everyone speaks two languages, and switches mid-sentence'),
  ('URY', 'people-and-power',    2, 'a small country that decides things by voting on them a lot'),
  ('URY', 'land-and-sky',        2, 'the wind makes most of the electricity'),
  ('AUS', 'wild-places',         3, 'animals that exist nowhere else, and a reef visible from space'),
  ('AUS', 'ancient-world',       3, 'rock art older than anything standing in Europe'),
  ('NZL', 'land-and-sky',        3, 'volcanoes, glaciers, and steam coming straight out of the ground'),
  ('NZL', 'wild-places',         2, 'birds that gave up flying because nothing was hunting them'),
  ('PNG', 'wild-places',         3, 'forest nobody has finished surveying'),
  ('PNG', 'people-and-power',    2, 'more languages than any other country on earth'),
  ('FJI', 'food-and-craft',      2, 'cooking underground, and navigating by stars'),
  ('FJI', 'wild-places',         2, 'three hundred islands and the reef around them'),
  ('TON', 'people-and-power',    3, 'the Pacific kingdom nobody ever managed to take'),
  ('TON', 'land-and-sky',        2, 'a volcano here changed the sky over the whole world'),
  ('WSM', 'food-and-craft',      2, 'houses built without walls, and dinner cooked in the ground'),
  ('WSM', 'people-and-power',    2, 'a country that moved itself across the date line overnight'),
  ('TUV', 'land-and-sky',        3, 'the whole country is barely above the sea'),
  ('TUV', 'conflict-and-change', 3, 'a country making plans for the day it is underwater'),
  ('TCD', 'land-and-sky',        3, 'a lake drying up while people watch it happen'),
  ('TCD', 'wild-places',         2, 'desert rock arches, and animals hanging on where they should not'),
  ('LSO', 'land-and-sky',        3, 'the entire country is up a mountain'),
  ('LSO', 'wild-places',         2, 'snow in southern Africa, which nobody expects'),
  ('NER', 'ancient-world',       3, 'dinosaur beds, and a desert holding on to what people left'),
  ('NER', 'land-and-sky',        2, 'the Sahara is moving, and you can find out which way'),
  ('DJI', 'land-and-sky',        3, 'three tectonic plates pulling apart under one small country'),
  ('DJI', 'wild-places',         2, 'whale sharks turn up every winter'),
  ('KGZ', 'wild-places',         3, 'summer pastures, horses, and a lake that will not freeze'),
  ('KGZ', 'food-and-craft',      2, 'felt rugs, and a whole forest of walnut trees'),
  ('VUT', 'wild-places',         3, 'volcanoes you can walk right up to the edge of'),
  ('VUT', 'food-and-craft',      2, 'diving off a tower with vines, which is where bungee came from'),
  ('PLW', 'wild-places',         3, 'a lake full of jellyfish that cannot sting you'),
  ('PLW', 'land-and-sky',        2, 'islands shaped like mushrooms in impossibly green water'),
  ('GUY', 'wild-places',         3, 'one of the biggest single-drop falls, in forest nobody has cleared'),
  ('GUY', 'land-and-sky',        2, 'far more forest than people, and it is staying that way'),

  -- Who Lives Here, Who Gets What and Stories and Spirits (D-15). The other six
  -- focuses were seeded two to a country; these three had no row anywhere, which
  -- made them pickable and never suggested. Twenty countries each, so every
  -- adorned country now carries three.
  --
  -- Every country here already holds hooks, and that is a rule rather than a
  -- coincidence: "Deal me three" only deals a country with two or more hooks
  -- (public/js/deal.js), so a recommendation on an unhooked country is one the
  -- shuffle can never show. Qatar and Bangladesh are the two this cost — both
  -- are excellent Who Gets What months and neither is in the shuffle.
  --
  -- The countries were chosen against the prompts each focus actually reaches,
  -- not against its name: `where-the-price-goes` and `somebody-elses-museum` for
  -- Who Gets What, `kid-life` and `how-you-get-a-house` for Who Lives Here,
  -- `their-alphabet` and `creature-they-warn-about` for Stories and Spirits.
  ('JPN', 'who-lives-here',      3, 'they clean their own school and walk there on their own'),
  ('KOR', 'who-lives-here',      3, 'their school day ends long after yours would have'),
  ('MNG', 'who-lives-here',      3, 'a home that packs onto a cart, and no tap to follow'),
  ('IND', 'who-lives-here',      3, 'big households, lunch tins, and water that comes on at set hours'),
  ('FIN', 'who-lives-here',      3, 'school starts at seven and lunch is free for every child'),
  ('CUB', 'who-lives-here',      3, 'a ration book, a housing swap, and a uniform for every grade'),
  ('VNM', 'who-lives-here',      2, 'breakfast on a plastic stool and a whole family on one motorbike'),
  ('PHL', 'who-lives-here',      2, 'so much is written in English you can hear it from a kid there'),
  ('KEN', 'who-lives-here',      2, 'uniforms, matatus, and paying for everything by phone'),
  ('RWA', 'who-lives-here',      2, 'one Saturday a month the whole country cleans up together'),
  ('MAR', 'who-lives-here',      2, 'the bathhouse, the bakery and the market are all one street'),
  ('TZA', 'who-lives-here',      2, 'school in Swahili, and everybody greets everybody first'),
  ('LKA', 'who-lives-here',      2, 'white uniforms, free school, and rice and curry three times a day'),
  ('BRA', 'who-lives-here',      2, 'school in the morning or the afternoon, and football in between'),
  ('ARG', 'who-lives-here',      2, 'a white coat for school, dinner at ten, and mate going round'),
  ('DOM', 'who-lives-here',      2, 'baseball in the street and a corner shop that sells everything'),
  ('ESP', 'who-lives-here',      2, 'dinner at ten at night and kids still out in the square'),
  ('NLD', 'who-lives-here',      2, 'the whole country gets around by bike, kids included'),
  ('WSM', 'who-lives-here',      2, 'a house with no walls, and a family that runs the village'),
  ('BTN', 'who-lives-here',      2, 'the national dress is what you wear to school and to work'),

  ('COD', 'who-gets-what',       3, 'what is inside your phone came out of the ground here'),
  ('GHA', 'who-gets-what',       3, 'follow a chocolate bar back and find out who got paid'),
  ('SAU', 'who-gets-what',       3, 'most of the work there is done by people who came to do it'),
  ('BOL', 'who-gets-what',       3, 'silver built somebody else''s empire, and now it is the lithium'),
  ('ZAF', 'who-gets-what',       3, 'who owns the land here is still being argued out loud'),
  ('HTI', 'who-gets-what',       3, 'they freed themselves, and then were made to pay for it'),
  ('NGA', 'who-gets-what',       3, 'their bronzes sit in other people''s museums, and they want them back'),
  ('PAK', 'who-gets-what',       3, 'a girl from here spoke up about school and the world heard it'),
  ('UZB', 'who-gets-what',       2, 'the whole country was sent to pick cotton, until people said stop'),
  ('GTM', 'who-gets-what',       2, 'the people who own the land and the people who work it are not the same'),
  ('CHL', 'who-gets-what',       2, 'copper pays for the country, and one of the moai is in London'),
  ('LBN', 'who-gets-what',       2, 'a small country holding more people who ran than almost anywhere'),
  ('UGA', 'who-gets-what',       2, 'people who arrive running are given land and allowed to work'),
  ('AUS', 'who-gets-what',       2, 'children were taken from their families, and the country said sorry'),
  ('COL', 'who-gets-what',       2, 'millions walked in from next door and were let in'),
  ('SEN', 'who-gets-what',       2, 'the coast people were taken from, with the buildings still on it'),
  ('KHM', 'who-gets-what',       2, 'statues taken from their temples are being sent home'),
  ('PER', 'who-gets-what',       2, 'the mines pay for a lot, and the villages above them see least'),
  ('TUR', 'who-gets-what',       2, 'it has taken in more people running from war than almost anywhere'),
  ('GBR', 'who-gets-what',       2, 'a lot of what other countries are asking for back is here'),

  ('ISL', 'stories-and-spirits', 3, 'sagas, hidden folk, and a name that tells you whose child you are'),
  ('IRL', 'stories-and-spirits', 3, 'fairy forts nobody will plough, and monks who wrote the books'),
  ('ETH', 'stories-and-spirits', 3, 'its own alphabet, its own calendar, and one of the oldest churches'),
  ('MEX', 'stories-and-spirits', 3, 'the dead get a day, a table and their favourite food'),
  ('GRC', 'stories-and-spirits', 3, 'the myths you already know, and the churches Paul wrote to'),
  ('CZE', 'stories-and-spirits', 3, 'Hus, the Golem, and a clock that has run since the 1400s'),
  ('NZL', 'stories-and-spirits', 3, 'the North Island is a fish somebody pulled up'),
  ('IDN', 'stories-and-spirits', 3, 'the stories get told with shadow puppets, all night long'),
  ('ISR', 'stories-and-spirits', 3, 'you can stand in the places the stories happened'),
  ('DEU', 'stories-and-spirits', 2, 'the Grimms wrote the tales down, and Luther made the Bible German'),
  ('RUS', 'stories-and-spirits', 2, 'Baba Yaga, the firebird, and an alphabet worth copying out'),
  ('MDG', 'stories-and-spirits', 2, 'the ancestors are family, and there are rules about everything'),
  ('NOR', 'stories-and-spirits', 2, 'trolls, runes, and wooden churches eight hundred years old'),
  ('PNG', 'stories-and-spirits', 2, 'over eight hundred languages, and people still translating into them'),
  ('MLT', 'stories-and-spirits', 2, 'Paul was shipwrecked here and they will show you where'),
  ('THA', 'stories-and-spirits', 2, 'every building has a little house outside it for the spirits'),
  ('CHN', 'stories-and-spirits', 2, 'a zodiac, a monkey king, and numbers that are lucky or not'),
  ('EGY', 'stories-and-spirits', 2, 'the Holy Family came through, and the church here never left'),
  ('ITA', 'stories-and-spirits', 2, 'saints, catacombs, and a witch who brings the presents'),
  ('JAM', 'stories-and-spirits', 2, 'Anansi came over with the people, and duppies came too')
-- END country_focus_affinity
) v
JOIN countries c ON c.iso3 = v.iso3
JOIN focuses f ON f.slug = v.focus
WHERE true
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Adventure level, corrected where writing the hooks proved the seed wrong.
--
-- research_depth is the one column in the library that is allowed to be revised
-- from a seed file, because it is the one nothing else writes: the library
-- editor does not expose it, so this UPDATE cannot overwrite anybody's work and
-- re-running it changes nothing the second time.
--
-- Down means a country turned out to have more kid-findable material than the
-- first pass credited it with. Up is the honest direction and the one that
-- matters more: 1 promises "lots to find", and a country where an 11-year-old
-- will spend twenty tasks hitting dead ends must not carry that promise (§9).
-- Where information is controlled, contested or mostly written for adults, the
-- level says so.
-- ---------------------------------------------------------------------------
UPDATE countries SET research_depth = CASE iso3
  WHEN 'BOL' THEN 1   -- Uyuni, La Paz and the altitude: plenty, and all of it visual
  WHEN 'ECU' THEN 1   -- the Galapagos alone would carry a month
  WHEN 'BWA' THEN 1   -- the Okavango is documented to death, in English, for kids
  WHEN 'MLT' THEN 1   -- temples, knights and a shipwreck on one small island
  WHEN 'VAT' THEN 1   -- the most photographed few acres on earth
  WHEN 'TON' THEN 2   -- a kingdom and a volcano that made the news everywhere
  WHEN 'WSM' THEN 2   -- the date line story and the fale are both easy to find
  WHEN 'AFG' THEN 2   -- the ancient half is findable; the last fifty years are not, for a kid
  WHEN 'SYR' THEN 2   -- Palmyra and Damascus are there, and most of the rest is war reporting
  WHEN 'PSE' THEN 2   -- ancient sites are well covered; almost everything else is contested
  WHEN 'PRK' THEN 2   -- nearly everything published is either guesswork or propaganda
END
WHERE iso3 IN ('BOL', 'ECU', 'BWA', 'MLT', 'VAT', 'TON', 'WSM', 'AFG', 'SYR', 'PSE', 'PRK');
