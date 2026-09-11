-- Alpha-only provisional plan. Rooms are configured before the event.
CREATE TABLE venue_rooms (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, block TEXT NOT NULL,
 project_mode TEXT NOT NULL CHECK(project_mode IN ('Prepared', 'Starting from scratch')),
 sector TEXT NOT NULL CHECK(sector IN ('Agriculture', 'Education', 'Healthcare')),
 solution_type TEXT NOT NULL CHECK(solution_type IN ('Technical', 'Non-Technical')),
 seats INTEGER NOT NULL CHECK(seats BETWEEN 2 AND 4)
);
CREATE TABLE venue_tables (
 id INTEGER PRIMARY KEY, room_id INTEGER NOT NULL REFERENCES venue_rooms(id),
 table_number INTEGER NOT NULL CHECK(table_number > 0), UNIQUE(room_id, table_number)
);
CREATE TABLE venue_checkins (
 team_id INTEGER PRIMARY KEY REFERENCES hackathon_teams(id) ON DELETE CASCADE,
 project_mode TEXT NOT NULL CHECK(project_mode IN ('Prepared', 'Starting from scratch'))
);
CREATE TABLE venue_allocations (
 team_id INTEGER PRIMARY KEY REFERENCES hackathon_teams(id) ON DELETE CASCADE,
 table_id INTEGER NOT NULL UNIQUE REFERENCES venue_tables(id),
 assigned_by TEXT NOT NULL, assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE VIEW venue_requirements AS
 SELECT t.id AS team_id, t.team_name, t.team_code, t.sector_track, t.solution_type,
 c.project_mode, COUNT(a.id) > 0 AS attendance_marked,
 COALESCE(SUM(a.present = 1), 0) AS present_count,
 COALESCE(MAX(CASE WHEN m.id = COALESCE(t.attendance_lead_member_id,
 (SELECT id FROM hackathon_team_members WHERE team_id = t.id AND role = 'Captain' LIMIT 1))
 THEN a.present ELSE 0 END), 0) AS lead_present
 FROM hackathon_teams t LEFT JOIN venue_checkins c ON c.team_id = t.id
 LEFT JOIN hackathon_team_members m ON m.team_id = t.id
 LEFT JOIN hackathon_attendance a ON a.id = (SELECT aa.id FROM hackathon_attendance aa
 WHERE aa.member_id = m.id AND aa.team_id = t.id
 ORDER BY aa.attendance_date DESC, aa.marked_at DESC, aa.id DESC LIMIT 1)
 WHERE t.submitted_at IS NOT NULL GROUP BY t.id;
