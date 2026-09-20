-- Token issuance is split into small batches so one request stays well inside
-- the Workers CPU limit. `next_index` is how far through their teacher list a
-- student has been served: a plain counter, with no teacher identity in it, so
-- the row still says nothing beyond "this student collected tokens".
ALTER TABLE issuances ADD COLUMN next_index INTEGER NOT NULL DEFAULT 0;
