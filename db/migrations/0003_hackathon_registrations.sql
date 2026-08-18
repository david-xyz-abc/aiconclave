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
