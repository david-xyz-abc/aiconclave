ALTER TABLE attendance_sessions ADD COLUMN admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_admin_user
  ON attendance_sessions (admin_user_id);
