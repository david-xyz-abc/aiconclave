-- Organizer-requested event-day policy: judges may retry passwords without
-- the 15-minute account lockout. Enforce in D1 so already-deployed clients
-- take effect immediately. Password verification and the login gate remain.
-- Venue-admin accounts retain their existing lockout policy.
CREATE TRIGGER IF NOT EXISTS judging_users_no_judge_lockout_insert
AFTER INSERT ON judging_users
WHEN NEW.role = 'judge' AND (NEW.failed_attempts <> 0 OR NEW.locked_until <> 0)
BEGIN
  UPDATE judging_users SET failed_attempts = 0, locked_until = 0 WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS judging_users_no_judge_lockout_update
AFTER UPDATE OF failed_attempts, locked_until, role ON judging_users
WHEN NEW.role = 'judge' AND (NEW.failed_attempts <> 0 OR NEW.locked_until <> 0)
BEGIN
  UPDATE judging_users SET failed_attempts = 0, locked_until = 0 WHERE id = NEW.id;
END;

UPDATE judging_users SET failed_attempts = 0, locked_until = 0
WHERE role = 'judge' AND (failed_attempts <> 0 OR locked_until <> 0);
