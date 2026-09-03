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
      LEFT JOIN hackathon_attendance a ON a.team_id = t.id AND a.member_id = m.id AND a.attendance_date = ?
      WHERE t.submitted_at IS NOT NULL AND (t.team_name LIKE ? OR t.team_code LIKE ? OR lead.full_name LIKE ? OR captain.full_name LIKE ?)
      GROUP BY t.id ORDER BY lower(t.team_name), t.id`).bind(date, like, like, like, like).all();
    return attendanceJson({ ok: true, teams: result.results || [] });
  } catch (error) {
    console.error(JSON.stringify({ event: "attendance_teams_query_failed", reason: error instanceof Error ? error.message : "unknown" }));
    return attendanceJson({ ok: false, error: "Could not load hackathon teams. Apply the attendance migration first." }, 500);
  }
}
