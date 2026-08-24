-- Require all newly created or edited panel registrations to use the
-- canonical Indian phone format: +91 followed by exactly 10 digits.
CREATE TRIGGER IF NOT EXISTS validate_panel_phone_on_insert
BEFORE INSERT ON panel_registrations
WHEN length(NEW.phone) != 13
  OR substr(NEW.phone, 1, 3) != '+91'
  OR substr(NEW.phone, 4) GLOB '*[^0-9]*'
BEGIN
  SELECT RAISE(ABORT, 'invalid_panel_phone');
END;

CREATE TRIGGER IF NOT EXISTS validate_panel_phone_on_update
BEFORE UPDATE OF phone ON panel_registrations
WHEN length(NEW.phone) != 13
  OR substr(NEW.phone, 1, 3) != '+91'
  OR substr(NEW.phone, 4) GLOB '*[^0-9]*'
BEGIN
  SELECT RAISE(ABORT, 'invalid_panel_phone');
END;
