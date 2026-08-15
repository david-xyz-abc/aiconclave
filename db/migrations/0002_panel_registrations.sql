CREATE TABLE IF NOT EXISTS panel_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  participant_type TEXT NOT NULL,
  organisation TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  panel_selection TEXT NOT NULL,
  industry_sector TEXT NOT NULL DEFAULT '',
  industry_sector_other TEXT NOT NULL DEFAULT '',
  organisation_type TEXT NOT NULL DEFAULT '',
  organisation_type_other TEXT NOT NULL DEFAULT '',
  information_confirmed INTEGER NOT NULL DEFAULT 1,
  updates_opt_in INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_panel_registrations_email
  ON panel_registrations (email);

CREATE INDEX IF NOT EXISTS idx_panel_registrations_created_at
  ON panel_registrations (created_at);
