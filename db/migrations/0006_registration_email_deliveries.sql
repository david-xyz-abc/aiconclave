-- Transactional outbox for registration confirmation messages. Registration
-- data remains the source of truth; message content and OAuth credentials are
-- deliberately never stored here.
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

PRAGMA optimize;
