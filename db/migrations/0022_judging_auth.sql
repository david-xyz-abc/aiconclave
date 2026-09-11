-- Independent judging-site accounts; attendance/admin credentials do not grant access.
CREATE TABLE judging_users (
 id TEXT PRIMARY KEY,
 username TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 password_salt TEXT NOT NULL,
 password_iterations INTEGER NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('venue_admin','judge')),
 failed_attempts INTEGER NOT NULL DEFAULT 0,
 locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE judging_sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES judging_users(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL
);
CREATE INDEX judging_session_expiry ON judging_sessions(expires_at);
