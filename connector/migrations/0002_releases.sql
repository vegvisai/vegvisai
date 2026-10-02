-- Signed monthly releases of the open index (P46). Generated from SCHEMA in src/register.js.
CREATE TABLE IF NOT EXISTS releases (
  period TEXT PRIMARY KEY,       -- YYYY-MM; a release is never changed
  created_at TEXT NOT NULL,
  body TEXT NOT NULL,            -- the exact bytes that are signed
  sha256 TEXT NOT NULL,
  signature TEXT NOT NULL,       -- Ed25519, base64
  key_id TEXT NOT NULL
);
