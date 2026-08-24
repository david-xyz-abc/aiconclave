-- Short-lived, privacy-preserving fixed-window counters used by the shared API
-- middleware. Only a SHA-256-derived bucket key is stored; client IP addresses
-- and session tokens are never written to this table.
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
