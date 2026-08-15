-- AI Conclave 2026 panel discussion registrations
CREATE TABLE IF NOT EXISTS panel_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  phone TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (
    participant_type IN ('Student', 'Faculty / Academic', 'Professional / Industry Delegate', 'Researcher', 'Other')
  ),
  organisation TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  panel_selection TEXT NOT NULL CHECK (
    panel_selection IN ('AI in Agriculture', 'AI in Education', 'AI in Healthcare', 'Interested in All Panels')
  ),
  industry_sector TEXT NOT NULL DEFAULT '' CHECK (
    industry_sector IN ('', 'Agriculture', 'Education', 'Healthcare', 'IT / Technology', 'Government', 'Other')
  ),
  industry_sector_other TEXT NOT NULL DEFAULT '',
  organisation_type TEXT NOT NULL DEFAULT '' CHECK (
    organisation_type IN ('', 'Startup', 'MSME', 'Corporate', 'Government', 'Academic Institution', 'Research Organization', 'NGO', 'Other')
  ),
  organisation_type_other TEXT NOT NULL DEFAULT '',
  information_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (information_confirmed IN (0, 1)),
  updates_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (updates_opt_in IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (industry_sector <> 'Other' OR length(trim(industry_sector_other)) > 0),
  CHECK (organisation_type <> 'Other' OR length(trim(organisation_type_other)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_panel_registrations_email
  ON panel_registrations (email);

CREATE INDEX IF NOT EXISTS idx_panel_registrations_panel_selection
  ON panel_registrations (panel_selection);

CREATE INDEX IF NOT EXISTS idx_panel_registrations_created_at
  ON panel_registrations (created_at);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
  ON admin_sessions (expires_at);
