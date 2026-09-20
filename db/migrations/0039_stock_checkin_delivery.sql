-- Persistent tombstones deliberately have no cascading foreign keys.
CREATE TABLE IF NOT EXISTS stock_sync_control (
 id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0,
 activated_at TEXT
);
INSERT OR IGNORE INTO stock_sync_control(id) VALUES(1);
CREATE TABLE IF NOT EXISTS stock_checkin_deliveries (
 id INTEGER PRIMARY KEY, event_id TEXT NOT NULL DEFAULT '3',
 team_id INTEGER NOT NULL, member_id INTEGER NOT NULL, email_key TEXT NOT NULL,
 name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('excluded','pending','sending','sent','failed','uncertain')),
 created_at TEXT NOT NULL DEFAULT (datetime('now')), attempted_at TEXT, finished_at TEXT,
 remote_id TEXT, detail TEXT,
 UNIQUE(event_id,member_id), UNIQUE(event_id,email_key)
);
CREATE INDEX IF NOT EXISTS stock_delivery_pending ON stock_checkin_deliveries(status,id);
CREATE INDEX IF NOT EXISTS stock_delivery_team ON stock_checkin_deliveries(team_id);
CREATE TRIGGER IF NOT EXISTS stock_checkin_insert AFTER INSERT ON hackathon_attendance
WHEN NEW.present=1 AND (SELECT enabled FROM stock_sync_control WHERE id=1)=1
BEGIN
 INSERT INTO stock_checkin_deliveries(team_id,member_id,email_key,name,email,phone,status)
 SELECT m.team_id,m.id,lower(trim(m.email)),m.full_name,trim(m.email),m.phone,'pending'
 FROM hackathon_team_members m WHERE m.id=NEW.member_id AND m.team_id=NEW.team_id
 ON CONFLICT DO NOTHING;
END;
CREATE TRIGGER IF NOT EXISTS stock_checkin_update AFTER UPDATE OF present ON hackathon_attendance
WHEN NEW.present=1 AND (SELECT enabled FROM stock_sync_control WHERE id=1)=1
BEGIN
 INSERT INTO stock_checkin_deliveries(team_id,member_id,email_key,name,email,phone,status)
 SELECT m.team_id,m.id,lower(trim(m.email)),m.full_name,trim(m.email),m.phone,'pending'
 FROM hackathon_team_members m WHERE m.id=NEW.member_id AND m.team_id=NEW.team_id
 ON CONFLICT DO NOTHING;
END;
