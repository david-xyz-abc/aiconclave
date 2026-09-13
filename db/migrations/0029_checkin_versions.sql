-- Per-team optimistic check-in concurrency, preserving existing event data.
ALTER TABLE hackathon_teams ADD COLUMN checkin_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE checkin_save_guards (
 team_id INTEGER PRIMARY KEY REFERENCES hackathon_teams(id) ON DELETE CASCADE,
 expected_version INTEGER NOT NULL
);
CREATE TRIGGER checkin_save_guard BEFORE INSERT ON checkin_save_guards
WHEN NOT EXISTS (SELECT 1 FROM hackathon_teams WHERE id=NEW.team_id AND checkin_version=NEW.expected_version AND submitted_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'checkin_stale_version'); END;
CREATE TRIGGER checkin_save_start AFTER INSERT ON checkin_save_guards
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id=NEW.team_id; END;
CREATE TRIGGER checkin_team_changed AFTER UPDATE OF team_name,team_size,sector_track,solution_type,attendance_lead_member_id,submitted_at ON hackathon_teams
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id=NEW.id; END;
CREATE TRIGGER checkin_hackathon_team_members_insert AFTER INSERT ON hackathon_team_members
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (NEW.team_id); END;
CREATE TRIGGER checkin_hackathon_team_members_update AFTER UPDATE ON hackathon_team_members
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (OLD.team_id,NEW.team_id); END;
CREATE TRIGGER checkin_hackathon_team_members_delete AFTER DELETE ON hackathon_team_members
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (OLD.team_id); END;
CREATE TRIGGER checkin_hackathon_attendance_insert AFTER INSERT ON hackathon_attendance
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (NEW.team_id); END;
CREATE TRIGGER checkin_hackathon_attendance_update AFTER UPDATE ON hackathon_attendance
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (OLD.team_id,NEW.team_id); END;
CREATE TRIGGER checkin_hackathon_attendance_delete AFTER DELETE ON hackathon_attendance
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (OLD.team_id); END;
CREATE TRIGGER checkin_venue_checkins_insert AFTER INSERT ON venue_checkins
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (NEW.team_id); END;
CREATE TRIGGER checkin_venue_checkins_update AFTER UPDATE ON venue_checkins
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (OLD.team_id,NEW.team_id); END;
CREATE TRIGGER checkin_venue_checkins_delete AFTER DELETE ON venue_checkins
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (OLD.team_id); END;
CREATE TRIGGER checkin_venue_allocations_insert AFTER INSERT ON venue_allocations
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (NEW.team_id); END;
CREATE TRIGGER checkin_venue_allocations_update AFTER UPDATE ON venue_allocations
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (OLD.team_id,NEW.team_id); END;
CREATE TRIGGER checkin_venue_allocations_delete AFTER DELETE ON venue_allocations
BEGIN UPDATE hackathon_teams SET checkin_version=checkin_version+1 WHERE id IN (OLD.team_id); END;
