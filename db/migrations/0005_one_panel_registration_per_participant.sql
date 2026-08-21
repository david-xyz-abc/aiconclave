-- Existing historical rows are left untouched. This trigger atomically prevents
-- every signed-in participant from creating another panel registration.
CREATE TRIGGER IF NOT EXISTS one_panel_registration_per_participant
BEFORE INSERT ON panel_registrations
WHEN NEW.participant_account_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM panel_registrations
    WHERE participant_account_id = NEW.participant_account_id
       OR lower(email) = lower(NEW.email)
  )
BEGIN
  SELECT RAISE(ABORT, 'one_panel_registration_per_participant');
END;
