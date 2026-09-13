-- Evaluation saves conflict only with changes to their own team or to routing.
-- Keep the original workspace revision for venue-admin optimistic locking.
ALTER TABLE judging_state ADD COLUMN routing_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE judging_changes ADD COLUMN expected_routing_revision INTEGER;
ALTER TABLE judging_changes ADD COLUMN evaluation_team_id INTEGER;
ALTER TABLE judging_changes ADD COLUMN expected_evaluation_revision INTEGER;
ALTER TABLE judging_changes ADD COLUMN evaluation_judge_id TEXT;
DROP TRIGGER judging_write_guard;
CREATE TRIGGER judging_write_guard BEFORE INSERT ON judging_changes
WHEN (NEW.expected_routing_revision IS NULL AND NEW.expected_revision <> (SELECT revision FROM judging_state WHERE id=1)) OR (NEW.expected_routing_revision IS NOT NULL AND (
   NEW.action NOT IN ('evaluation_nominations','evaluation_scores','evaluation_submit')
   OR NEW.evaluation_team_id IS NULL OR NEW.expected_evaluation_revision IS NULL OR NEW.evaluation_judge_id IS NULL
   OR NEW.expected_routing_revision <> (SELECT routing_revision FROM judging_state WHERE id=1)
   OR NEW.expected_evaluation_revision <> COALESCE((SELECT revision FROM judging_evaluations WHERE team_id=NEW.evaluation_team_id),0)
   OR EXISTS(SELECT 1 FROM judging_evaluations WHERE team_id=NEW.evaluation_team_id AND status='submitted')
   OR NOT EXISTS(SELECT 1 FROM judging_assignments WHERE team_id=NEW.evaluation_team_id AND judge_id=NEW.evaluation_judge_id)
 ))
BEGIN
 SELECT RAISE(ABORT,'judging_stale_revision');
END;
DROP TRIGGER judging_write_revision;
CREATE TRIGGER judging_write_revision AFTER INSERT ON judging_changes
BEGIN
 UPDATE judging_state SET revision=revision+1,
 routing_revision=routing_revision+CASE WHEN NEW.action IN ('evaluation_nominations','evaluation_scores','evaluation_submit','evaluation_reopen') THEN 0 ELSE 1 END WHERE id=1;
END;

DROP TRIGGER judging_track_venue_allocations_insert;
CREATE TRIGGER judging_track_venue_allocations_insert AFTER INSERT ON venue_allocations
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_allocations_update;
CREATE TRIGGER judging_track_venue_allocations_update AFTER UPDATE ON venue_allocations
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_allocations_delete;
CREATE TRIGGER judging_track_venue_allocations_delete AFTER DELETE ON venue_allocations
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_checkins_insert;
CREATE TRIGGER judging_track_venue_checkins_insert AFTER INSERT ON venue_checkins
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_checkins_update;
CREATE TRIGGER judging_track_venue_checkins_update AFTER UPDATE ON venue_checkins
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_checkins_delete;
CREATE TRIGGER judging_track_venue_checkins_delete AFTER DELETE ON venue_checkins
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_rooms_insert;
CREATE TRIGGER judging_track_venue_rooms_insert AFTER INSERT ON venue_rooms
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_rooms_update;
CREATE TRIGGER judging_track_venue_rooms_update AFTER UPDATE ON venue_rooms
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_rooms_delete;
CREATE TRIGGER judging_track_venue_rooms_delete AFTER DELETE ON venue_rooms
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_tables_insert;
CREATE TRIGGER judging_track_venue_tables_insert AFTER INSERT ON venue_tables
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_tables_update;
CREATE TRIGGER judging_track_venue_tables_update AFTER UPDATE ON venue_tables
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_venue_tables_delete;
CREATE TRIGGER judging_track_venue_tables_delete AFTER DELETE ON venue_tables
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_hackathon_teams_insert;
CREATE TRIGGER judging_track_hackathon_teams_insert AFTER INSERT ON hackathon_teams
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_hackathon_teams_update;
CREATE TRIGGER judging_track_hackathon_teams_update AFTER UPDATE ON hackathon_teams
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_hackathon_teams_delete;
CREATE TRIGGER judging_track_hackathon_teams_delete AFTER DELETE ON hackathon_teams
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_hackathon_attendance_insert;
CREATE TRIGGER judging_track_hackathon_attendance_insert AFTER INSERT ON hackathon_attendance
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_hackathon_attendance_update;
CREATE TRIGGER judging_track_hackathon_attendance_update AFTER UPDATE ON hackathon_attendance
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_hackathon_attendance_delete;
CREATE TRIGGER judging_track_hackathon_attendance_delete AFTER DELETE ON hackathon_attendance
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_hackathon_team_members_insert;
CREATE TRIGGER judging_track_hackathon_team_members_insert AFTER INSERT ON hackathon_team_members
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_hackathon_team_members_update;
CREATE TRIGGER judging_track_hackathon_team_members_update AFTER UPDATE ON hackathon_team_members
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

DROP TRIGGER judging_track_hackathon_team_members_delete;
CREATE TRIGGER judging_track_hackathon_team_members_delete AFTER DELETE ON hackathon_team_members
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

CREATE TRIGGER judging_routing_judging_assignments_insert AFTER INSERT ON judging_assignments
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

CREATE TRIGGER judging_routing_judging_assignments_update AFTER UPDATE ON judging_assignments
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

CREATE TRIGGER judging_routing_judging_assignments_delete AFTER DELETE ON judging_assignments
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

CREATE TRIGGER judging_routing_judging_room_order_insert AFTER INSERT ON judging_room_order
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

CREATE TRIGGER judging_routing_judging_room_order_update AFTER UPDATE ON judging_room_order
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

CREATE TRIGGER judging_routing_judging_room_order_delete AFTER DELETE ON judging_room_order
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

CREATE TRIGGER judging_routing_judging_judges_insert AFTER INSERT ON judging_judges
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

CREATE TRIGGER judging_routing_judging_judges_update AFTER UPDATE ON judging_judges
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;

CREATE TRIGGER judging_routing_judging_judges_delete AFTER DELETE ON judging_judges
BEGIN
 UPDATE judging_state SET revision=revision+1,routing_revision=routing_revision+1 WHERE id=1;
END;
