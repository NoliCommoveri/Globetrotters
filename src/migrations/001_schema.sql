-- 001_schema.sql — every table and index in DESIGN.md §5.
--
-- Migration files are append-only. Nothing in this file is ever edited once it
-- has been applied: an edit shows up on /admin as drift, not as a re-run. To
-- change the schema, add 002_.
--
-- No `people` rows and no library rows here. Seed data is slice 02, and naming
-- your own kids must not require editing a migration in a web editor (§3).

CREATE TABLE people (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL,          -- passport stamp ink
  sort_order   INTEGER NOT NULL DEFAULT 0,  -- fixed display order, never sorted by progress
  created_at   TEXT NOT NULL
);

CREATE TABLE countries (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  iso3           TEXT NOT NULL UNIQUE,
  continent      TEXT NOT NULL,
  region         TEXT,
  research_depth INTEGER NOT NULL DEFAULT 1
    CHECK (research_depth BETWEEN 1 AND 3)   -- 1 lots to find, 3 you'll have to hunt
);

CREATE TABLE focuses (
  id           INTEGER PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  blurb        TEXT,                   -- one kid-readable line
  archived     INTEGER NOT NULL DEFAULT 0,
  origin       TEXT NOT NULL DEFAULT 'seed'
);

CREATE TABLE project_types (
  id           INTEGER PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  materials    TEXT,                   -- freeform "what you'll need"
  archived     INTEGER NOT NULL DEFAULT 0,
  origin       TEXT NOT NULL DEFAULT 'seed'
);

CREATE TABLE country_hooks (
  id           INTEGER PRIMARY KEY,
  country_id   INTEGER NOT NULL REFERENCES countries(id),
  text         TEXT NOT NULL,          -- a lead, not a fact. See §9.
  position     INTEGER NOT NULL DEFAULT 0,
  origin       TEXT NOT NULL DEFAULT 'seed'
);

CREATE TABLE country_focus_affinity (
  country_id   INTEGER NOT NULL REFERENCES countries(id),
  focus_id     INTEGER NOT NULL REFERENCES focuses(id),
  score        INTEGER NOT NULL CHECK (score IN (2, 3)),  -- 2 good fit, 3 exceptional
  reason       TEXT,                   -- kid-facing, one line
  PRIMARY KEY (country_id, focus_id)
);

CREATE TABLE task_templates (
  id              INTEGER PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE, -- stable key; seed upserts on this
  title           TEXT NOT NULL,       -- "Draw and color the flag"
  prompt          TEXT NOT NULL,       -- the 10-minute instruction, kid voice
  week_theme      INTEGER NOT NULL CHECK (week_theme BETWEEN 1 AND 4),
  workbook_page   TEXT,                -- 'flag', 'map', 'history', 'ecology', ...
  tier            TEXT NOT NULL CHECK (tier IN ('core','focus','wild')),
  project_type_id INTEGER REFERENCES project_types(id),  -- week 4 only
  position        INTEGER,             -- week 4 ordering
  archived        INTEGER NOT NULL DEFAULT 0,
  origin          TEXT NOT NULL DEFAULT 'seed' CHECK (origin IN ('seed','custom')),
  updated_at      TEXT
);

-- Sparse on purpose: a missing row means weight 1. Only opinions are stored.
CREATE TABLE task_focus_weights (
  task_template_id INTEGER NOT NULL REFERENCES task_templates(id),
  focus_id         INTEGER NOT NULL REFERENCES focuses(id),
  weight           REAL NOT NULL,      -- 0 excludes, 3 favors
  PRIMARY KEY (task_template_id, focus_id)
);

CREATE TABLE month_plans (
  id              INTEGER PRIMARY KEY,
  person_id       INTEGER NOT NULL REFERENCES people(id),
  month           TEXT NOT NULL,        -- '2026-09'
  start_date      TEXT NOT NULL,        -- 'YYYY-MM-DD', anchors week_no to the calendar
  country_id      INTEGER NOT NULL REFERENCES countries(id),
  focus_id        INTEGER NOT NULL REFERENCES focuses(id),
  project_type_id INTEGER NOT NULL REFERENCES project_types(id),
  status          TEXT NOT NULL CHECK (status IN ('active','complete')),
  created_at      TEXT NOT NULL,
  completed_at    TEXT,
  UNIQUE (person_id, month)
);

CREATE TABLE plan_tasks (
  id               INTEGER PRIMARY KEY,
  plan_id          INTEGER NOT NULL REFERENCES month_plans(id),
  task_template_id INTEGER NOT NULL REFERENCES task_templates(id),
  week_no          INTEGER NOT NULL CHECK (week_no BETWEEN 1 AND 4),
  position         INTEGER NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('open','done')),
  completed_at     TEXT,
  swapped_from     INTEGER REFERENCES task_templates(id),
  UNIQUE (plan_id, task_template_id)
);

CREATE TABLE sessions (
  id            INTEGER PRIMARY KEY,
  plan_id       INTEGER NOT NULL REFERENCES month_plans(id),
  plan_task_id  INTEGER REFERENCES plan_tasks(id),
  minutes       INTEGER,
  note          TEXT,                   -- one line, optional; feeds stamp headlines
  logged_at     TEXT NOT NULL,
  local_date    TEXT NOT NULL           -- 'YYYY-MM-DD' in FAMILY_TZ, written at insert
);

CREATE TABLE stamps (
  id           INTEGER PRIMARY KEY,
  plan_id      INTEGER NOT NULL UNIQUE REFERENCES month_plans(id),
  person_id    INTEGER NOT NULL REFERENCES people(id),
  country_id   INTEGER NOT NULL REFERENCES countries(id),
  focus_id     INTEGER NOT NULL REFERENCES focuses(id),
  earned_at    TEXT NOT NULL,
  headline     TEXT                     -- one thing they'll remember
);

CREATE TABLE media (                    -- R2 pointers; table only, no bucket in v1
  id            INTEGER PRIMARY KEY,
  plan_id       INTEGER NOT NULL REFERENCES month_plans(id),
  plan_task_id  INTEGER REFERENCES plan_tasks(id),
  r2_key        TEXT NOT NULL,
  kind          TEXT NOT NULL,
  uploaded_at   TEXT NOT NULL
);

CREATE INDEX idx_plan_tasks_plan_week ON plan_tasks(plan_id, week_no);
CREATE INDEX idx_sessions_plan_date   ON sessions(plan_id, local_date);
CREATE INDEX idx_weights_focus        ON task_focus_weights(focus_id);
CREATE INDEX idx_stamps_person        ON stamps(person_id);
CREATE INDEX idx_hooks_country        ON country_hooks(country_id);
