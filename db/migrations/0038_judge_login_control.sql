CREATE TABLE IF NOT EXISTS judging_login_control (
 id INTEGER PRIMARY KEY CHECK(id=1),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_by TEXT
);
INSERT OR IGNORE INTO judging_login_control(id,enabled) VALUES(1,0);
