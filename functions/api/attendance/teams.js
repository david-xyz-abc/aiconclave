import { attendanceJson, requireAttendanceSession } from "../../_shared/attendance.js";

export async function onRequestGet(context) {
  const auth = await requireAttendanceSession(context);
  if (auth.response) return auth.response;
  const params = new URL(context.request.url).searchParams;
  const query = (params.get("q") || "").trim().slice(0, 100);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") || "") ? params.get("date") : new Date().toISOString().slice(0, 10);
  const like = `%${query}%`;
  try {
    const result = await context.env.DB.prepare(`
      SELECT t.id, t.team_code, t.team_name, t.team_size, t.participant_category,
        COALESCE(lead.full_name, captain.full_name, '') AS lead_name,
        COUNT(m.id) AS member_count,
        COALESCE(SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END), 0) AS present_count
      FROM hackathon_teams t
      LEFT JOIN hackathon_team_members m ON m.team_id = t.id
      LEFT JOIN hackathon_team_members lead ON lead.id = t.attendance_lead_member_id
      LEFT JOIN hackathon_team_members captain ON captain.team_id = t.id AND captain.role = 'Captain'
      LEFT JOIN hackathon_attendance a ON a.id = (SELECT aa.id FROM hackathon_attendance aa WHERE aa.team_id = t.id AND aa.member_id = m.id ORDER BY aa.attendance_date DESC, aa.marked_at DESC, aa.id DESC LIMIT 1)
      WHERE t.submitted_at IS NOT NULL AND (t.team_name LIKE ? OR t.team_code LIKE ? OR lead.full_name LIKE ? OR captain.full_name LIKE ?)
      GROUP BY t.id ORDER BY lower(t.team_name), t.id`).bind(like, like, like, like).all();
    const peopleResult = await context.env.DB.prepare(`
      SELECT t.id AS team_id, t.team_code, t.team_name,
        COALESCE(lead.full_name, captain.full_name, '') AS lead_name,
        m.id AS member_id, m.full_name, m.institution,
        a.attendance_date, a.present
      FROM hackathon_teams t
      LEFT JOIN hackathon_team_members lead ON lead.id = t.attendance_lead_member_id
      LEFT JOIN hackathon_team_members captain ON captain.team_id = t.id AND captain.role = 'Captain'
      JOIN hackathon_team_members m ON m.team_id = t.id
      LEFT JOIN hackathon_attendance a ON a.team_id = t.id AND a.member_id = m.id
      WHERE t.submitted_at IS NOT NULL
        AND (t.team_name LIKE ? OR t.team_code LIKE ? OR lead.full_name LIKE ? OR captain.full_name LIKE ? OR m.full_name LIKE ?)
      ORDER BY lower(t.team_name), t.id, m.member_order, a.attendance_date`).bind(like, like, like, like, like).all();
    const peopleMap = new Map();
    for (const row of peopleResult.results || []) {
      if (!peopleMap.has(row.member_id)) peopleMap.set(row.member_id, { team_id: row.team_id, team_code: row.team_code, team_name: row.team_name, lead_name: row.lead_name, member_id: row.member_id, full_name: row.full_name, institution: row.institution, attendance: {} });
      if (row.attendance_date) peopleMap.get(row.member_id).attendance[row.attendance_date] = Boolean(row.present);
    }
    const datesResult = await context.env.DB.prepare("SELECT DISTINCT attendance_date FROM hackathon_attendance WHERE attendance_date IS NOT NULL ORDER BY attendance_date DESC").all();
    return attendanceJson({ ok: true, teams: result.results || [], people: [...peopleMap.values()], dates: (datesResult.results || []).map((row) => row.attendance_date) });
  } catch (error) {
    console.error(JSON.stringify({ event: "attendance_teams_query_failed", reason: error instanceof Error ? error.message : "unknown" }));
    return attendanceJson({ ok: false, error: "Could not load hackathon teams. Apply the attendance migration first." }, 500);
  }
}
