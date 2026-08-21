-- Team-based hackathon registrations.
-- The legacy hackathon_registrations table is intentionally preserved so that
-- any existing individual registrations remain recoverable.

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
  team_size INTEGER NOT NULL CHECK (
    team_size BETWEEN 2 AND 4
  ),
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
  member_order INTEGER NOT NULL CHECK (
    member_order BETWEEN 1 AND 4
  ),
  role TEXT NOT NULL CHECK (
    role IN ('Captain', 'Member')
  ),
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

-- Emails are claimed only when a team is finally submitted. This permits
-- harmless drafts while preventing one student from joining two submitted
-- teams. The API must insert all claims and set submitted_at atomically.
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

PRAGMA optimize;
