-- Judging shares the alpha seating data, but has its own allocation records.
CREATE TABLE judging_state (id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL DEFAULT 0);
INSERT INTO judging_state(id) VALUES (1);
CREATE TABLE judging_judges (
 id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
 solution_type TEXT NOT NULL CHECK(solution_type IN ('Technical','Non-Technical')),
 sector_filter TEXT NOT NULL DEFAULT '', mode_filter TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE judging_room_order (
 room_id INTEGER PRIMARY KEY REFERENCES venue_rooms(id), position INTEGER NOT NULL
);
INSERT INTO judging_room_order SELECT id, id FROM venue_rooms;
CREATE TABLE judging_assignments (
 team_id INTEGER PRIMARY KEY REFERENCES hackathon_teams(id) ON DELETE CASCADE,
 judge_id TEXT NOT NULL REFERENCES judging_judges(id),
 table_id INTEGER NOT NULL REFERENCES venue_tables(id),
 visit_order INTEGER NOT NULL CHECK(visit_order > 0),
 assigned_by TEXT NOT NULL,
 assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(judge_id, visit_order)
);
CREATE INDEX judging_assignment_judge ON judging_assignments(judge_id);
CREATE TABLE judging_changes (
 id TEXT PRIMARY KEY, expected_revision INTEGER NOT NULL, actor TEXT NOT NULL,
 action TEXT NOT NULL, details TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TRIGGER judging_write_guard BEFORE INSERT ON judging_changes
WHEN NEW.expected_revision <> (SELECT revision FROM judging_state WHERE id=1)
BEGIN
 SELECT RAISE(ABORT,'judging_stale_revision');
END;
CREATE TRIGGER judging_write_revision AFTER INSERT ON judging_changes
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_allocations_insert AFTER INSERT ON venue_allocations
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_allocations_update AFTER UPDATE ON venue_allocations
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_allocations_delete AFTER DELETE ON venue_allocations
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_checkins_insert AFTER INSERT ON venue_checkins
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_checkins_update AFTER UPDATE ON venue_checkins
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_checkins_delete AFTER DELETE ON venue_checkins
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_rooms_insert AFTER INSERT ON venue_rooms
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_rooms_update AFTER UPDATE ON venue_rooms
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_rooms_delete AFTER DELETE ON venue_rooms
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_tables_insert AFTER INSERT ON venue_tables
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_tables_update AFTER UPDATE ON venue_tables
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_venue_tables_delete AFTER DELETE ON venue_tables
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_hackathon_teams_insert AFTER INSERT ON hackathon_teams
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_hackathon_teams_update AFTER UPDATE ON hackathon_teams
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_hackathon_teams_delete AFTER DELETE ON hackathon_teams
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_hackathon_attendance_insert AFTER INSERT ON hackathon_attendance
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_hackathon_attendance_update AFTER UPDATE ON hackathon_attendance
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_hackathon_attendance_delete AFTER DELETE ON hackathon_attendance
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_hackathon_team_members_insert AFTER INSERT ON hackathon_team_members
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_hackathon_team_members_update AFTER UPDATE ON hackathon_team_members
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER judging_track_hackathon_team_members_delete AFTER DELETE ON hackathon_team_members
BEGIN
 UPDATE judging_state SET revision=revision+1 WHERE id=1;
END;
