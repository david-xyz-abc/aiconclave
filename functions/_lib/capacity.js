export const STUDENT_COUNT_SQL = `SELECT COUNT(*) FROM hackathon_team_members m
  JOIN hackathon_teams t ON t.id = m.team_id WHERE t.submitted_at IS NOT NULL`

export const HACKATHON_PARTICIPANT_LIMIT = 1990

export async function getHackathonCapacity(db) {
  const row = await db.prepare(`SELECT (${STUDENT_COUNT_SQL}) AS students`).first()
  const students = Number(row.students)
  const remaining = Math.max(0, HACKATHON_PARTICIPANT_LIMIT - students)
  const open = remaining >= 2 // The smallest eligible team has two participants.
  return { students, category: 'All', unlimited: false, limit: HACKATHON_PARTICIPANT_LIMIT, remaining, open, collegeOpen: open, schoolOpen: open }
}
