-- Keep committee availability separate from judge identity.
ALTER TABLE judging_judges ADD COLUMN slot_preference TEXT NOT NULL DEFAULT '';
ALTER TABLE judging_judges ADD COLUMN is_backup INTEGER NOT NULL DEFAULT 0 CHECK(is_backup IN (0,1));
ALTER TABLE judging_judges ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE judging_judges ADD COLUMN institution TEXT NOT NULL DEFAULT '';
