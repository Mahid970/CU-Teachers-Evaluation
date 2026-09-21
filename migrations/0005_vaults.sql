-- Cross-device rating.
--
-- A student's tokens are encrypted in their own browser with a key derived from
-- a passphrase we never see, and only the ciphertext is stored here. The row is
-- not filed under the student either: `lookup` is derived from their ID *and*
-- their passphrase together, so without the passphrase this table cannot be
-- attributed to anyone, let alone read.
--
-- Both columns are wrapped again on the server under VAULT_PEPPER, a Workers
-- secret, so a copy of this database on its own gives an attacker nothing to
-- guess against.
CREATE TABLE vaults (
  lookup     TEXT PRIMARY KEY,   -- HMAC(VAULT_PEPPER, client lookup)
  term_id    TEXT NOT NULL REFERENCES terms(id),
  ciphertext TEXT NOT NULL,      -- client ciphertext, wrapped again under the pepper
  updated_on TEXT NOT NULL       -- date only, never a timestamp
) WITHOUT ROWID;
