-- CU Teacher Evaluation — schema.
--
-- Design rule: nothing here may link a rating to a person. `issuances` records
-- that some student verified this term; `ratings` records what was rated. They
-- share no key, and there is no table joining them.

CREATE TABLE faculties (
  key        TEXT PRIMARY KEY,
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  short_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE departments (
  slug        TEXT PRIMARY KEY,
  code        TEXT,               -- 3-digit ID code, NULL for units with no intake
  name        TEXT NOT NULL,
  faculty_key TEXT NOT NULL REFERENCES faculties(key),
  kind        TEXT NOT NULL,      -- department | institute | centre
  sort_order  INTEGER NOT NULL
);
CREATE INDEX idx_departments_faculty ON departments(faculty_key);

CREATE TABLE teachers (
  id           TEXT PRIMARY KEY,  -- employee id from cu.ac.bd
  name         TEXT NOT NULL,
  designation  TEXT NOT NULL,
  dept_slug    TEXT NOT NULL REFERENCES departments(slug),
  photo_url    TEXT,
  profile_url  TEXT,
  active       INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_teachers_dept ON teachers(dept_slug);
-- Teacher emails from the scrape are deliberately NOT stored: the site never
-- contacts teachers, and holding them adds risk without adding function.

CREATE TABLE terms (
  id        TEXT PRIMARY KEY,     -- e.g. "2026-1"
  label     TEXT NOT NULL,        -- e.g. "Spring 2026"
  opens_at  TEXT NOT NULL,        -- ISO date
  closes_at TEXT NOT NULL,
  is_open   INTEGER NOT NULL DEFAULT 0
);

-- Public half of each teacher's per-term blind signing key. The private half
-- lives in Workers Secrets and is destroyed when the term closes.
CREATE TABLE teacher_term_keys (
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  term_id    TEXT NOT NULL REFERENCES terms(id),
  public_key TEXT NOT NULL,       -- JWK
  PRIMARY KEY (teacher_id, term_id)
);

-- One row per student per term: "this ID already collected its tokens".
-- The HMAC pepper is per-term and is deleted once the term closes, after which
-- these rows are not reversible even by brute force over all 8-digit IDs.
CREATE TABLE issuances (
  term_id      TEXT NOT NULL REFERENCES terms(id),
  student_hmac TEXT NOT NULL,
  issued_on    TEXT NOT NULL,     -- date only, never a timestamp
  PRIMARY KEY (term_id, student_hmac)
);

-- A rating is keyed by the hash of an anonymous token. Nothing about the
-- student is present, and re-submitting the same token updates this row.
CREATE TABLE ratings (
  token_hash    TEXT PRIMARY KEY,
  teacher_id    TEXT NOT NULL REFERENCES teachers(id),
  term_id       TEXT NOT NULL REFERENCES terms(id),
  clarity       INTEGER NOT NULL,
  knowledge     INTEGER NOT NULL,
  punctuality   INTEGER NOT NULL,
  fairness      INTEGER NOT NULL,
  accessibility INTEGER NOT NULL,
  engagement    INTEGER NOT NULL,
  overall       INTEGER NOT NULL,
  difficulty    INTEGER NOT NULL,
  take_again    INTEGER NOT NULL, -- 0/1
  tags          TEXT NOT NULL DEFAULT '[]',
  rated_on      TEXT NOT NULL     -- date only
);
CREATE INDEX idx_ratings_teacher_term ON ratings(teacher_id, term_id);

-- Aggregates rebuilt by the daily cron, so live pages never expose the moment
-- a rating arrived.
CREATE TABLE teacher_stats (
  teacher_id     TEXT NOT NULL REFERENCES teachers(id),
  term_id        TEXT NOT NULL,   -- "all" for the all-time roll-up
  n              INTEGER NOT NULL,
  avg_clarity       REAL NOT NULL,
  avg_knowledge     REAL NOT NULL,
  avg_punctuality   REAL NOT NULL,
  avg_fairness      REAL NOT NULL,
  avg_accessibility REAL NOT NULL,
  avg_engagement    REAL NOT NULL,
  avg_overall       REAL NOT NULL,
  avg_difficulty    REAL NOT NULL,
  take_again_pct    REAL NOT NULL,
  bayesian_score    REAL NOT NULL,
  distribution      TEXT NOT NULL DEFAULT '[0,0,0,0,0]', -- overall 1..5 counts
  tag_counts        TEXT NOT NULL DEFAULT '{}',
  updated_on        TEXT NOT NULL,
  PRIMARY KEY (teacher_id, term_id)
);
CREATE INDEX idx_stats_term_score ON teacher_stats(term_id, bayesian_score DESC);
