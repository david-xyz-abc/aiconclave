-- Remove only attendance-independent registration capacity guards; preserve all data.
DROP TRIGGER IF EXISTS hackathon_capacity_member_insert;
DROP TRIGGER IF EXISTS hackathon_capacity_member_move;
DROP TRIGGER IF EXISTS hackathon_capacity_team_submit;
