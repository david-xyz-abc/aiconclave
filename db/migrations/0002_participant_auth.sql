CREATE TABLE IF NOT EXISTS participant_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS participant_sessions (
  token_hash TEXT PRIMARY KEY,
  participant_account_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (participant_account_id) REFERENCES participant_accounts(id) ON DELETE CASCADE
);

ALTER TABLE panel_registrations
  ADD COLUMN participant_account_id INTEGER REFERENCES participant_accounts(id);

CREATE INDEX IF NOT EXISTS idx_participant_sessions_account
  ON participant_sessions (participant_account_id);

CREATE INDEX IF NOT EXISTS idx_participant_sessions_expires
  ON participant_sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_panel_registrations_account
  ON panel_registrations (participant_account_id);

PRAGMA optimize;
