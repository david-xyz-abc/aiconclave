ALTER TABLE hackathon_teams ADD COLUMN attendance_lead_member_id INTEGER;

CREATE TABLE IF NOT EXISTS hackathon_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  attendance_date TEXT NOT NULL CHECK (length(attendance_date) = 10),
  present INTEGER NOT NULL DEFAULT 0 CHECK (present IN (0, 1)),
  marked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  marked_by TEXT NOT NULL DEFAULT 'attendance-desk',
  FOREIGN KEY (team_id) REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES hackathon_team_members(id) ON DELETE CASCADE,
  UNIQUE (team_id, member_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_attendance_team_date
  ON hackathon_attendance (team_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_hackathon_attendance_date
  ON hackathon_attendance (attendance_date);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_expires_at
  ON attendance_sessions (expires_at);
