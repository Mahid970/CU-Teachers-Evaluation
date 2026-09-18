-- Signing keys are per teacher per term. The private half is stored wrapped
-- with MASTER_KEY (Workers secret), and is deleted when the term closes.
ALTER TABLE teacher_term_keys ADD COLUMN private_key_wrapped TEXT;
