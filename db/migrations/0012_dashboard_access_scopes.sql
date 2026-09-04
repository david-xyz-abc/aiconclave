ALTER TABLE admin_users ADD COLUMN registrations_access TEXT NOT NULL DEFAULT 'none'
  CHECK (registrations_access IN ('none', 'read', 'write'));

ALTER TABLE admin_users ADD COLUMN attendance_access TEXT NOT NULL DEFAULT 'none'
  CHECK (attendance_access IN ('none', 'read', 'write'));
