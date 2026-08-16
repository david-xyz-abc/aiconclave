-- AI Conclave 2026 participant identities and panel discussion registrations.
-- Add hackathon and workshop registration tables after their fields are confirmed.

CREATE TABLE IF NOT EXISTS participant_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  last_login_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
);

CREATE TABLE IF NOT EXISTS participant_sessions (
  token_hash TEXT PRIMARY KEY,
  participant_account_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (participant_account_id)
    REFERENCES participant_accounts(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS panel_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  phone TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (
    participant_type IN (
      'Student',
      'Faculty / Academic',
      'Professional / Industry Delegate',
      'Researcher',
      'Other'
    )
  ),
  organisation TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  panel_selection TEXT NOT NULL CHECK (
    panel_selection IN (
      'AI in Agriculture',
      'AI in Education',
      'AI in Healthcare'
    )
  ),
  industry_sector TEXT NOT NULL DEFAULT '' CHECK (
    industry_sector IN ('', 'Agriculture', 'Education', 'Healthcare', 'IT / Technology', 'Government', 'Other')
  ),
  industry_sector_other TEXT NOT NULL DEFAULT '',
  organisation_type TEXT NOT NULL DEFAULT '' CHECK (
    organisation_type IN ('', 'Startup', 'MSME', 'Corporate', 'Government', 'Academic Institution', 'Research Organization', 'NGO', 'Other')
  ),
  organisation_type_other TEXT NOT NULL DEFAULT '',
  information_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (
    information_confirmed IN (0, 1)
  ),
  updates_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (
    updates_opt_in IN (0, 1)
  ),
  participant_account_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  FOREIGN KEY (participant_account_id)
    REFERENCES participant_accounts(id),
  CHECK (
    industry_sector <> 'Other'
    OR length(trim(industry_sector_other)) > 0
  ),
  CHECK (
    organisation_type <> 'Other'
    OR length(trim(organisation_type_other)) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_panel_registrations_email
  ON panel_registrations (email);

CREATE INDEX IF NOT EXISTS idx_panel_registrations_panel_selection
  ON panel_registrations (panel_selection);

CREATE INDEX IF NOT EXISTS idx_panel_registrations_created_at
  ON panel_registrations (created_at);

CREATE INDEX IF NOT EXISTS idx_panel_registrations_account
  ON panel_registrations (participant_account_id);

CREATE INDEX IF NOT EXISTS idx_participant_sessions_account
  ON participant_sessions (participant_account_id);

CREATE INDEX IF NOT EXISTS idx_participant_sessions_expires
  ON participant_sessions (expires_at);

PRAGMA optimize;
