-- P54: lookup counts per business and month, and the address a business chose to give for alerts.
-- Generated from SCHEMA in src/register.js.
CREATE TABLE IF NOT EXISTS lookups (
  domain TEXT NOT NULL,
  month TEXT NOT NULL,
  kind TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (domain, month, kind)
);
CREATE TABLE IF NOT EXISTS contacts (
  org_number TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'nb',
  token TEXT NOT NULL UNIQUE,
  confirmed_at TEXT,
  created_at TEXT NOT NULL
);
