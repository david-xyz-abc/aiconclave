import { attendanceJson, requireAttendanceAdmin } from "../../_shared/attendance.js";

export async function onRequestGet(context) {
  const auth = await requireAttendanceAdmin(context);
  if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare(`
      SELECT t.id AS team_id, t.team_code, t.team_name, t.participant_category,
        t.sector_track, t.solution_type,
        COALESCE(lead.id, captain.id) AS lead_member_id,
        COALESCE(lead.full_name, captain.full_name, '') AS lead_name,
        m.id AS member_id, m.member_order, m.full_name, m.email, m.phone,
        m.institution, m.department_or_course, m.year_or_grade,
        CASE WHEN m.id = COALESCE(lead.id, captain.id) THEN 1 ELSE 0 END AS is_lead,
        a.attendance_date, a.present, a.marked_at
      FROM hackathon_teams t
      LEFT JOIN hackathon_team_members lead ON lead.id = t.attendance_lead_member_id
      LEFT JOIN hackathon_team_members captain ON captain.team_id = t.id AND captain.role = 'Captain'
      JOIN hackathon_team_members m ON m.team_id = t.id
      LEFT JOIN hackathon_attendance a ON a.team_id = t.id AND a.member_id = m.id
      WHERE t.submitted_at IS NOT NULL
      ORDER BY lower(t.team_name), t.id, m.member_order, a.attendance_date`).all();
    const teams = new Map();
    for (const row of result.results || []) {
      if (!teams.has(row.team_id)) teams.set(row.team_id, { id: row.team_id, team_code: row.team_code, team_name: row.team_name, participant_category: row.participant_category, sector_track: row.sector_track, solution_type: row.solution_type, lead_member_id: row.lead_member_id, lead_name: row.lead_name, members: [], attendance: [] });
      const team = teams.get(row.team_id);
      if (!team.members.some((member) => member.id === row.member_id)) team.members.push({ id: row.member_id, member_order: row.member_order, full_name: row.full_name, email: row.email, phone: row.phone, institution: row.institution, department_or_course: row.department_or_course, year_or_grade: row.year_or_grade, is_lead: Boolean(row.is_lead) });
      if (row.attendance_date) team.attendance.push({ member_id: row.member_id, member_name: row.full_name, date: row.attendance_date, present: Boolean(row.present), marked_at: row.marked_at });
    }
    return attendanceJson({ ok: true, exported_at: new Date().toISOString(), teams: [...teams.values()] });
  } catch (error) {
    console.error(JSON.stringify({ event: "attendance_export_failed", reason: error instanceof Error ? error.message : "unknown" }));
    return attendanceJson({ ok: false, error: "Could not export attendance." }, 500);
  }
}
