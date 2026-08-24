-- AI Conclave 2026 participant identities, panel and hackathon registrations.

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
  challenge_area TEXT NOT NULL CHECK (
    challenge_area IN ('Agriculture', 'Health', 'Education')
  ),
  subcategory TEXT NOT NULL,
  problem_area TEXT NOT NULL,
  idea_summary TEXT NOT NULL DEFAULT '',
  information_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (
    information_confirmed IN (0, 1)
  ),
  participant_account_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  FOREIGN KEY (participant_account_id)
    REFERENCES participant_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_email
  ON hackathon_registrations (email);

CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_challenge
  ON hackathon_registrations (challenge_area, subcategory);

CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_created_at
  ON hackathon_registrations (created_at);

CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_account
  ON hackathon_registrations (participant_account_id);

-- Team-based hackathon registration. The earlier individual-registration
-- table remains above for compatibility with any existing records.

CREATE TABLE IF NOT EXISTS hackathon_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_code TEXT COLLATE NOCASE UNIQUE,
  team_name TEXT NOT NULL CHECK (
    length(trim(team_name)) BETWEEN 2 AND 100
  ),
  team_name_key TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (
    length(trim(team_name_key)) BETWEEN 2 AND 100
    AND team_name_key = lower(trim(team_name_key))
  ),
  captain_account_id INTEGER NOT NULL UNIQUE,
  participant_category TEXT NOT NULL CHECK (
    participant_category IN ('School', 'College')
  ),
  team_size INTEGER NOT NULL CHECK (team_size BETWEEN 2 AND 4),
  sector_track TEXT NOT NULL CHECK (
    sector_track IN ('Education', 'Agriculture', 'Healthcare')
  ),
  solution_type TEXT NOT NULL CHECK (
    solution_type IN ('Technical', 'Non-Technical')
  ),
  information_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (
    information_confirmed IN (0, 1)
  ),
  rules_accepted INTEGER NOT NULL DEFAULT 0 CHECK (
    rules_accepted IN (0, 1)
  ),
  updates_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (
    updates_opt_in IN (0, 1)
  ),
  created_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  updated_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  submitted_at TEXT,
  FOREIGN KEY (captain_account_id)
    REFERENCES participant_accounts(id),
  CHECK (
    submitted_at IS NULL
    OR (information_confirmed = 1 AND rules_accepted = 1)
  )
);

CREATE TABLE IF NOT EXISTS hackathon_team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  member_order INTEGER NOT NULL CHECK (member_order BETWEEN 1 AND 4),
  role TEXT NOT NULL CHECK (role IN ('Captain', 'Member')),
  account_id INTEGER,
  full_name TEXT NOT NULL CHECK (
    length(trim(full_name)) BETWEEN 2 AND 120
  ),
  email TEXT NOT NULL COLLATE NOCASE CHECK (
    length(trim(email)) BETWEEN 3 AND 254
    AND instr(trim(email), '@') > 1
  ),
  email_key TEXT NOT NULL COLLATE NOCASE CHECK (
    email_key = lower(trim(email))
  ),
  phone TEXT NOT NULL CHECK (
    length(phone) = 13
    AND substr(phone, 1, 3) = '+91'
    AND substr(phone, 4) NOT GLOB '*[^0-9]*'
  ),
  institution TEXT NOT NULL CHECK (
    length(trim(institution)) BETWEEN 2 AND 200
  ),
  department_or_course TEXT NOT NULL DEFAULT '',
  year_or_grade TEXT NOT NULL CHECK (
    length(trim(year_or_grade)) BETWEEN 1 AND 80
  ),
  created_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  updated_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  FOREIGN KEY (team_id)
    REFERENCES hackathon_teams(id)
    ON DELETE CASCADE,
  FOREIGN KEY (account_id)
    REFERENCES participant_accounts(id)
    ON DELETE SET NULL,
  UNIQUE (team_id, member_order),
  UNIQUE (team_id, email_key),
  UNIQUE (team_id, id),
  CHECK (
    (role = 'Captain' AND member_order = 1)
    OR (role = 'Member' AND member_order BETWEEN 2 AND 4)
  )
);

CREATE TABLE IF NOT EXISTS hackathon_member_claims (
  email_key TEXT PRIMARY KEY COLLATE NOCASE CHECK (
    email_key = lower(trim(email_key))
  ),
  email TEXT NOT NULL COLLATE NOCASE CHECK (
    email_key = lower(trim(email))
  ),
  team_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL UNIQUE,
  claimed_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  FOREIGN KEY (team_id, member_id)
    REFERENCES hackathon_team_members(team_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hackathon_teams_category_track
  ON hackathon_teams (participant_category, sector_track, solution_type);

CREATE INDEX IF NOT EXISTS idx_hackathon_teams_submitted_at
  ON hackathon_teams (submitted_at);

CREATE INDEX IF NOT EXISTS idx_hackathon_teams_created_at
  ON hackathon_teams (created_at);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_members_team
  ON hackathon_team_members (team_id, member_order);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_members_email
  ON hackathon_team_members (email_key);

CREATE INDEX IF NOT EXISTS idx_hackathon_member_claims_team
  ON hackathon_member_claims (team_id);

CREATE INDEX IF NOT EXISTS idx_participant_sessions_account
  ON participant_sessions (participant_account_id);

CREATE INDEX IF NOT EXISTS idx_participant_sessions_expires
  ON participant_sessions (expires_at);

CREATE TABLE IF NOT EXISTS registration_email_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dedupe_key TEXT NOT NULL UNIQUE CHECK (
    length(dedupe_key) BETWEEN 8 AND 180
  ),
  registration_type TEXT NOT NULL CHECK (
    registration_type IN ('panel', 'hackathon')
  ),
  registration_id INTEGER NOT NULL,
  site_origin TEXT NOT NULL CHECK (
    site_origin LIKE 'https://%'
    OR site_origin LIKE 'http://localhost:%'
    OR site_origin LIKE 'http://127.0.0.1:%'
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sending', 'sent', 'failed')
  ),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (
    attempts BETWEEN 0 AND 3
  ),
  available_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  gmail_message_id TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  updated_at TEXT NOT NULL DEFAULT (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_registration_email_delivery_queue
  ON registration_email_deliveries (status, available_at, attempts);

CREATE INDEX IF NOT EXISTS idx_registration_email_delivery_registration
  ON registration_email_deliveries (registration_type, registration_id);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket_key TEXT PRIMARY KEY CHECK (length(bucket_key) = 64),
  route_key TEXT NOT NULL CHECK (length(route_key) BETWEEN 1 AND 120),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
  window_started_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_expiry
  ON api_rate_limits (expires_at);

PRAGMA optimize;
