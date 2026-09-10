-- Raise the hard limit without modifying existing registrations.
DROP TRIGGER IF EXISTS hackathon_capacity_member_insert;
DROP TRIGGER IF EXISTS hackathon_capacity_member_move;
DROP TRIGGER IF EXISTS hackathon_capacity_team_submit;

-- Count actual submitted members, not advertised team sizes. These guards also
-- cover dashboard edits and older deployments sharing the database.
CREATE TRIGGER IF NOT EXISTS hackathon_capacity_member_insert
BEFORE INSERT ON hackathon_team_members
WHEN EXISTS (SELECT 1 FROM hackathon_teams WHERE id = NEW.team_id AND submitted_at IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'hackathon_capacity_exceeded') WHERE
    (SELECT COUNT(*) FROM hackathon_team_members m JOIN hackathon_teams t ON t.id = m.team_id WHERE t.submitted_at IS NOT NULL) >= 1300;
END;

CREATE TRIGGER IF NOT EXISTS hackathon_capacity_member_move
BEFORE UPDATE OF team_id ON hackathon_team_members
WHEN NEW.team_id != OLD.team_id
  AND EXISTS (SELECT 1 FROM hackathon_teams WHERE id = NEW.team_id AND submitted_at IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM hackathon_teams WHERE id = OLD.team_id AND submitted_at IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'hackathon_capacity_exceeded') WHERE
    (SELECT COUNT(*) FROM hackathon_team_members m JOIN hackathon_teams t ON t.id = m.team_id WHERE t.submitted_at IS NOT NULL) >= 1300;
END;

CREATE TRIGGER IF NOT EXISTS hackathon_capacity_team_submit
BEFORE UPDATE OF submitted_at ON hackathon_teams
WHEN OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'hackathon_capacity_exceeded') WHERE
    (SELECT COUNT(*) FROM hackathon_team_members m JOIN hackathon_teams t ON t.id = m.team_id WHERE t.submitted_at IS NOT NULL)
    + (SELECT COUNT(*) FROM hackathon_team_members WHERE team_id = NEW.id) > 1300;
END;
