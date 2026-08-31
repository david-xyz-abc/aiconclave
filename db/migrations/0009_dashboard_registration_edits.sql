ALTER TABLE panel_registrations ADD COLUMN edit_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE panel_registrations ADD COLUMN last_edit_request_id TEXT NOT NULL DEFAULT '';

ALTER TABLE hackathon_registrations ADD COLUMN edit_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE hackathon_registrations ADD COLUMN last_edit_request_id TEXT NOT NULL DEFAULT '';

ALTER TABLE hackathon_teams ADD COLUMN edit_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE hackathon_teams ADD COLUMN last_edit_request_id TEXT NOT NULL DEFAULT '';

ALTER TABLE hackathon_team_members ADD COLUMN edit_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE hackathon_team_members ADD COLUMN last_edit_request_id TEXT NOT NULL DEFAULT '';

ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'
  CHECK (role IN ('viewer', 'editor', 'admin'));

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
