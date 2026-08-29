-- 004_worksheets.sql — the printed worksheet schema (DESIGN.md §5, §16).
--
-- A migration, and only a migration: it is checksummed, it applies once, and it
-- is never edited afterwards. The layout rows and the bindings that hang off
-- them live next door in 005_worksheet_layouts.sql, which is a seed.
--
-- The split is forced and it is the right shape anyway. SQLite has no
-- ADD COLUMN IF NOT EXISTS, so a file carrying these two ALTERs cannot be
-- re-executed by Run seed the way a seed file must be. Keeping the DDL here and
-- the rows there is also what lets the layouts and the bindings grow through the
-- year — a row added to a seed lands on the next press, and the same edit made
-- here would read as drift forever (§3).
--
-- Both columns are nullable and stay that way. A template with no layout prints
-- its prompt over ruled lines, so a printed month is complete before a single
-- binding exists and improves as they land.

CREATE TABLE worksheet_layouts (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL
    CHECK (kind IN ('lines','box','split','table','timeline','figures',
                    'checklist','storyboard','boxes','venn','chart','map',
                    'pair','flow','grid','clocks','fields')),
  height_thirds INTEGER NOT NULL CHECK (height_thirds BETWEEN 1 AND 3),
  spec          TEXT NOT NULL,
  archived      INTEGER NOT NULL DEFAULT 0,
  origin        TEXT NOT NULL DEFAULT 'seed'
);

ALTER TABLE task_templates ADD COLUMN worksheet_layout_id INTEGER REFERENCES worksheet_layouts(id);

ALTER TABLE task_templates ADD COLUMN worksheet_spec TEXT;
