-- Lets a student collect tokens for teachers added after they first signed in,
-- without ever recording a teacher against a student.
--
-- Every teacher gets a sequence number when added: the teachers here today are
-- all 0, and each one added later takes the next number. A student's issuance
-- row keeps only the highest number their tokens cover. Signing in again tops
-- up the teachers numbered above it and moves it up: a watermark, not a list.
ALTER TABLE teachers ADD COLUMN added_seq INTEGER NOT NULL DEFAULT 0;
ALTER TABLE issuances ADD COLUMN seq_through INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_teachers_seq ON teachers(added_seq);
