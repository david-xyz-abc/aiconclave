CREATE TRIGGER IF NOT EXISTS registration_closed_panel BEFORE INSERT ON panel_registrations BEGIN SELECT RAISE(ABORT,'registrations_closed'); END;
CREATE TRIGGER IF NOT EXISTS registration_closed_legacy BEFORE INSERT ON hackathon_registrations BEGIN SELECT RAISE(ABORT,'registrations_closed'); END;
CREATE TRIGGER IF NOT EXISTS registration_closed_team BEFORE INSERT ON hackathon_teams BEGIN SELECT RAISE(ABORT,'registrations_closed'); END;
CREATE TRIGGER IF NOT EXISTS registration_closed_member BEFORE INSERT ON hackathon_team_members BEGIN SELECT RAISE(ABORT,'registrations_closed'); END;
CREATE TRIGGER IF NOT EXISTS registration_closed_submit BEFORE UPDATE OF submitted_at ON hackathon_teams WHEN OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL BEGIN SELECT RAISE(ABORT,'registrations_closed'); END;
