-- The personal flag is stored with each changelog event, so an id never shows after the entry is deleted.
-- Releases can be withdrawn and replaced (GDPR art. 17). Generated from SCHEMA in src/register.js.
ALTER TABLE changes ADD COLUMN personal INTEGER NOT NULL DEFAULT 0;
UPDATE changes SET personal = 1 WHERE org_number IN (SELECT org_number FROM businesses WHERE sole_proprietorship = 1);
ALTER TABLE releases ADD COLUMN withdrawn TEXT;
ALTER TABLE releases ADD COLUMN replaced_by TEXT;
