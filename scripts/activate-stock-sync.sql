-- Execute these statements as ONE D1 batch. One-time activation; safe to repeat.
INSERT INTO stock_checkin_deliveries(team_id,member_id,email_key,name,email,phone,status,detail)
SELECT m.team_id,m.id,lower(trim(m.email)),m.full_name,trim(m.email),m.phone,'excluded','Checked in before activation'
FROM hackathon_team_members m
WHERE EXISTS(SELECT 1 FROM hackathon_attendance a WHERE a.member_id=m.id AND a.present=1)
AND (SELECT activated_at FROM stock_sync_control WHERE id=1) IS NULL
ON CONFLICT DO NOTHING;
UPDATE stock_sync_control SET enabled=1,activated_at=datetime('now') WHERE id=1 AND activated_at IS NULL;
