-- Count all submitted students, but apply the hard guard only to College.
-- School registrations remain unlimited and existing records are unchanged.
DROP TRIGGER IF EXISTS hackathon_capacity_member_insert;
DROP TRIGGER IF EXISTS hackathon_capacity_member_move;
DROP TRIGGER IF EXISTS hackathon_capacity_team_submit;

CREATE TRIGGER hackathon_capacity_member_insert
BEFORE INSERT ON hackathon_team_members
WHEN EXISTS (SELECT 1 FROM hackathon_teams WHERE id = NEW.team_id AND submitted_at IS NOT NULL AND participant_category = 'College')
BEGIN
  SELECT RAISE(ABORT, 'hackathon_capacity_exceeded') WHERE
    (SELECT COUNT(*) FROM hackathon_team_members m JOIN hackathon_teams t ON t.id = m.team_id WHERE t.submitted_at IS NOT NULL) >= 1300;
END;

CREATE TRIGGER hackathon_capacity_member_move
BEFORE UPDATE OF team_id ON hackathon_team_members
WHEN NEW.team_id != OLD.team_id
  AND EXISTS (SELECT 1 FROM hackathon_teams WHERE id = NEW.team_id AND submitted_at IS NOT NULL AND participant_category = 'College')
  AND NOT EXISTS (SELECT 1 FROM hackathon_teams WHERE id = OLD.team_id AND submitted_at IS NOT NULL AND participant_category = 'College')
BEGIN
  SELECT RAISE(ABORT, 'hackathon_capacity_exceeded') WHERE
    (SELECT COUNT(*) FROM hackathon_team_members m JOIN hackathon_teams t ON t.id = m.team_id WHERE t.submitted_at IS NOT NULL AND m.id != OLD.id) + 1 > 1300;
END;

CREATE TRIGGER hackathon_capacity_team_submit
BEFORE UPDATE OF submitted_at, participant_category ON hackathon_teams
WHEN NEW.submitted_at IS NOT NULL AND NEW.participant_category = 'College'
  AND (OLD.submitted_at IS NULL OR OLD.participant_category != 'College')
BEGIN
  SELECT RAISE(ABORT, 'hackathon_capacity_exceeded') WHERE
    (SELECT COUNT(*) FROM hackathon_team_members m JOIN hackathon_teams t ON t.id = m.team_id WHERE t.submitted_at IS NOT NULL AND t.id != NEW.id)
    + (SELECT COUNT(*) FROM hackathon_team_members WHERE team_id = NEW.id) > 1300;
END;
