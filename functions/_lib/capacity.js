export const STUDENT_COUNT_SQL = `SELECT COUNT(*) FROM hackathon_team_members m
  JOIN hackathon_teams t ON t.id = m.team_id WHERE t.submitted_at IS NOT NULL`

export async function getHackathonCapacity(db) {
  const row = await db.prepare(`SELECT (${STUDENT_COUNT_SQL}) AS students`).first()
  // Keep legacy clients open too; remaining is compatibility metadata, not an enforced cap.
  return { students: Number(row.students), category: 'All', unlimited: true, limit: null, remaining: Number.MAX_SAFE_INTEGER, open: true, collegeOpen: true, schoolOpen: true }
}
