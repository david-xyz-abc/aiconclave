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
  edit_version INTEGER NOT NULL DEFAULT 1,
  last_edit_request_id TEXT NOT NULL DEFAULT '',
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

CREATE TABLE IF NOT EXISTS hackathon_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  phone TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (
    participant_type IN ('Student', 'Faculty', 'Professional / Industry Delegate', 'Researcher', 'Other')
  ),
  organisation TEXT NOT NULL,
  tracks TEXT NOT NULL CHECK (json_valid(tracks)),
  challenge_area TEXT NOT NULL CHECK (challenge_area IN ('Agriculture', 'Health', 'Education')),
  subcategory TEXT NOT NULL,
  problem_area TEXT NOT NULL,
  idea_summary TEXT NOT NULL DEFAULT '',
  information_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (information_confirmed IN (0, 1)),
  participant_account_id INTEGER,
  edit_version INTEGER NOT NULL DEFAULT 1,
  last_edit_request_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_email ON hackathon_registrations (email);
CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_challenge ON hackathon_registrations (challenge_area, subcategory);
CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_created_at ON hackathon_registrations (created_at);

-- Participant identities are owned by the public registration site. They are
-- declared here so a fresh local dashboard database can mirror production.
CREATE TABLE IF NOT EXISTS participant_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Current team-based hackathon registrations. The individual table above is
-- retained only for compatibility with records created before team signup.
CREATE TABLE IF NOT EXISTS hackathon_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_code TEXT COLLATE NOCASE UNIQUE,
  team_name TEXT NOT NULL,
  team_name_key TEXT NOT NULL COLLATE NOCASE UNIQUE,
  captain_account_id INTEGER NOT NULL UNIQUE,
  participant_category TEXT NOT NULL CHECK (participant_category IN ('School', 'College')),
  team_size INTEGER NOT NULL CHECK (team_size BETWEEN 2 AND 4),
  sector_track TEXT NOT NULL CHECK (sector_track IN ('Education', 'Agriculture', 'Healthcare')),
  solution_type TEXT NOT NULL CHECK (solution_type IN ('Technical', 'Non-Technical')),
  information_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (information_confirmed IN (0, 1)),
  rules_accepted INTEGER NOT NULL DEFAULT 0 CHECK (rules_accepted IN (0, 1)),
  updates_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (updates_opt_in IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  edit_version INTEGER NOT NULL DEFAULT 1,
  last_edit_request_id TEXT NOT NULL DEFAULT '',
  submitted_at TEXT,
  FOREIGN KEY (captain_account_id) REFERENCES participant_accounts(id)
);

CREATE TABLE IF NOT EXISTS hackathon_team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  member_order INTEGER NOT NULL CHECK (member_order BETWEEN 1 AND 4),
  role TEXT NOT NULL CHECK (role IN ('Captain', 'Member')),
  account_id INTEGER,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  email_key TEXT NOT NULL COLLATE NOCASE,
  phone TEXT NOT NULL,
  institution TEXT NOT NULL,
  department_or_course TEXT NOT NULL DEFAULT '',
  year_or_grade TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  edit_version INTEGER NOT NULL DEFAULT 1,
  last_edit_request_id TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (team_id) REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES participant_accounts(id) ON DELETE SET NULL,
  UNIQUE (team_id, member_order),
  UNIQUE (team_id, email_key),
  UNIQUE (team_id, id)
);

CREATE TABLE IF NOT EXISTS hackathon_member_claims (
  email_key TEXT PRIMARY KEY COLLATE NOCASE,
  email TEXT NOT NULL COLLATE NOCASE,
  team_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL UNIQUE,
  claimed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (team_id, member_id) REFERENCES hackathon_team_members(team_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hackathon_teams_category_track ON hackathon_teams (participant_category, sector_track, solution_type);
CREATE INDEX IF NOT EXISTS idx_hackathon_teams_submitted_at ON hackathon_teams (submitted_at);
CREATE INDEX IF NOT EXISTS idx_hackathon_team_members_team ON hackathon_team_members (team_id, member_order);
CREATE INDEX IF NOT EXISTS idx_hackathon_team_members_email ON hackathon_team_members (email_key);
CREATE INDEX IF NOT EXISTS idx_hackathon_member_claims_team ON hackathon_member_claims (team_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('viewer', 'editor', 'admin')),
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

CREATE TABLE IF NOT EXISTS admin_registration_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  admin_user_id INTEGER NOT NULL,
  admin_username TEXT NOT NULL,
  registration_type TEXT NOT NULL CHECK (registration_type IN ('panel', 'hackathon')),
  record_type TEXT NOT NULL CHECK (record_type IN ('panel', 'team', 'legacy')),
  registration_id INTEGER NOT NULL,
  before_json TEXT NOT NULL CHECK (json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json)),
  changed_fields_json TEXT NOT NULL CHECK (json_valid(changed_fields_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_registration_audit_registration
  ON admin_registration_audit (registration_type, record_type, registration_id, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_registration_audit_admin
  ON admin_registration_audit (admin_user_id, created_at);
