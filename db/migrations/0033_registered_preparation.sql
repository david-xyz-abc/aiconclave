-- Preparation is a registration attribute, not a choice made at check-in.
ALTER TABLE hackathon_teams ADD COLUMN preparation_mode TEXT NOT NULL DEFAULT 'Starting from scratch' CHECK(preparation_mode IN ('Prepared','Starting from scratch'));
CREATE TRIGGER checkin_preparation_changed AFTER UPDATE OF preparation_mode ON hackathon_teams
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id=NEW.id; END;
DROP VIEW venue_requirements;
CREATE VIEW venue_requirements AS
 SELECT t.id AS team_id,t.team_name,t.team_code,t.sector_track,t.solution_type,
 t.preparation_mode AS project_mode,COUNT(a.id)>0 AS attendance_marked,
 COALESCE(SUM(a.present=1),0) AS present_count,
 COALESCE(MAX(CASE WHEN m.id=COALESCE(t.attendance_lead_member_id,
 (SELECT id FROM hackathon_team_members WHERE team_id=t.id AND role='Captain' LIMIT 1))
 THEN a.present ELSE 0 END),0) AS lead_present
 FROM hackathon_teams t
 LEFT JOIN hackathon_team_members m ON m.team_id=t.id
 LEFT JOIN hackathon_attendance a ON a.id=(SELECT aa.id FROM hackathon_attendance aa
 WHERE aa.member_id=m.id AND aa.team_id=t.id
 ORDER BY aa.attendance_date DESC,aa.marked_at DESC,aa.id DESC LIMIT 1)
 WHERE t.submitted_at IS NOT NULL GROUP BY t.id;
