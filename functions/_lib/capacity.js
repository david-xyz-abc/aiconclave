export const PUBLIC_STUDENT_LIMIT = 1196
export const STUDENT_COUNT_SQL = `SELECT COUNT(*) FROM hackathon_team_members m
  JOIN hackathon_teams t ON t.id = m.team_id WHERE t.submitted_at IS NOT NULL`

export async function getHackathonCapacity(db) {
  const row = await db.prepare(`SELECT (${STUDENT_COUNT_SQL}) AS students`).first()
  const remaining = Math.max(0, PUBLIC_STUDENT_LIMIT - Number(row.students))
  return { students: Number(row.students), limit: PUBLIC_STUDENT_LIMIT, remaining, open: remaining >= 2 }
}

export function capacityError(capacity) {
  return { ok: false, code: 'HACKATHON_CAPACITY', capacity,
    error: capacity.open ? `Only ${capacity.remaining} places remain. Your whole team must fit within the remaining places.` : 'Hackathon registration is closed.' }
}
