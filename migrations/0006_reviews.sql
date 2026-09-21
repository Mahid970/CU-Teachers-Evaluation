-- Written reviews.
--
-- A review is deliberately NOT stored beside the scores it came with. It is
-- keyed by a different hash of the same token, submitted in its own request,
-- and the two tables share no value — so nobody holding this database can pair
-- "never shows up" with the 1 out of 5 that came with it.
--
-- WITHOUT ROWID is load-bearing: a review's place in the table follows its
-- hash, not the order it arrived in, so insertion order cannot be lined up
-- against the ratings table either.
CREATE TABLE reviews (
  review_hash TEXT PRIMARY KEY,  -- SHA-256(token || "review"), unrelated to the rating's key
  teacher_id  TEXT NOT NULL REFERENCES teachers(id),
  term_id     TEXT NOT NULL REFERENCES terms(id),
  body        TEXT NOT NULL,
  hidden      INTEGER NOT NULL DEFAULT 0,
  written_on  TEXT NOT NULL      -- date only, and never shown
) WITHOUT ROWID;

CREATE INDEX idx_reviews_teacher ON reviews(teacher_id, term_id, hidden);
