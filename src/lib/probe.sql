-- Not a migration. This file exists to prove wrangler.toml's [[rules]] Text
-- entry actually bundles .sql files into the Worker, which slice 01's migration
-- runner depends on entirely. /admin/health imports it and prints its length.
--
-- It also carries the two characters that break a naive splitter, so slice 01's
-- splitter has something to chew on before the seed files arrive: a semicolon
-- inside a string literal, and an apostrophe.
SELECT 'a;b' AS semicolon_in_a_string, 'don''t' AS apostrophe;
