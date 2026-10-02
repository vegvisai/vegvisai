-- The register (P46). Generated from SCHEMA in src/register.js.
CREATE TABLE IF NOT EXISTS businesses (
  org_number TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  status TEXT NOT NULL,          -- pending, listed, removed
  entry TEXT NOT NULL,           -- JSON: only what the business publishes
  sole_proprietorship INTEGER NOT NULL DEFAULT 0,
  consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  org_number TEXT NOT NULL,
  action TEXT NOT NULL,          -- submitted, listed, updated, removed
  reason TEXT NOT NULL           -- neutral code, never free text
);
