import { attendanceJson, requireAttendanceAdmin } from "../../../_shared/attendance.js";

function validId(value) { const id = Number.parseInt(value, 10); return Number.isInteger(id) && id > 0 ? id : null; }
function validDate(value) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }

async function loadTeam(db, id, date) {
  const team = await db.prepare(`SELECT t.id, t.team_code, t.team_name, t.participant_category, t.sector_track, t.team_size, COALESCE(t.attendance_lead_member_id, captain.id) AS lead_member_id FROM hackathon_teams t LEFT JOIN hackathon_team_members captain ON captain.team_id = t.id AND captain.role = 'Captain' WHERE t.id = ? AND t.submitted_at IS NOT NULL`).bind(id).first();
  if (!team) return null;
  const members = await db.prepare(`SELECT m.id, m.full_name, m.email, m.institution, m.role, CASE WHEN a.present = 1 THEN 1 ELSE 0 END AS present FROM hackathon_team_members m LEFT JOIN hackathon_attendance a ON a.id = (SELECT aa.id FROM hackathon_attendance aa WHERE aa.member_id = m.id AND aa.team_id = m.team_id ORDER BY aa.attendance_date DESC, aa.marked_at DESC, aa.id DESC LIMIT 1) WHERE m.team_id = ? ORDER BY m.member_order`).bind(id).all();
  const dates = await db.prepare("SELECT DISTINCT attendance_date FROM hackathon_attendance WHERE team_id = ? ORDER BY attendance_date DESC").bind(id).all();
  return { ...team, member_count: (members.results || []).length, members: members.results || [], attendance_dates: (dates.results || []).map((row) => row.attendance_date), attendance_marked: Boolean((dates.results || []).length) };
}

export async function onRequestGet(context) {
  const auth = await requireAttendanceAdmin(context); if (auth.response) return auth.response;
  const id = validId(context.params.id); const date = validDate(new URL(context.request.url).searchParams.get("date")) || new Date().toISOString().slice(0, 10);
  if (!id) return attendanceJson({ ok: false, error: "Invalid team." }, 400);
  try { const team = await loadTeam(context.env.DB, id, date); return team ? attendanceJson({ ok: true, team, date }) : attendanceJson({ ok: false, error: "Team not found." }, 404); } catch { return attendanceJson({ ok: false, error: "Could not load this team." }, 500); }
}

export async function onRequestPost(context) {
  const auth = await requireAttendanceAdmin(context); if (auth.response) return auth.response;
  const id = validId(context.params.id); if (!id) return attendanceJson({ ok: false, error: "Invalid team." }, 400);
  let body; try { body = await context.request.json(); } catch { return attendanceJson({ ok: false, error: "Invalid request." }, 400); }
  const date = validDate(body?.date); const attendance = Array.isArray(body?.attendance) ? body.attendance : [];
  if (!date || !attendance.length || attendance.length > 20 || attendance.some((item) => !validId(item?.memberId))) return attendanceJson({ ok: false, error: "A valid date and member attendance list are required." }, 400);
  const memberIds = attendance.map((item) => validId(item.memberId));
  const existing = await context.env.DB.prepare(`SELECT id FROM hackathon_team_members WHERE team_id = ? AND id IN (${memberIds.map(() => "?").join(",")})`).bind(id, ...memberIds).all();
  if ((existing.results || []).length !== new Set(memberIds).size) return attendanceJson({ ok: false, error: "One or more members do not belong to this team." }, 400);
  try {
    await context.env.DB.batch(attendance.map((item) => context.env.DB.prepare(`INSERT INTO hackathon_attendance (team_id, member_id, attendance_date, present, marked_by) VALUES (?, ?, ?, ?, 'attendance-desk') ON CONFLICT(team_id, member_id, attendance_date) DO UPDATE SET present = excluded.present, marked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), marked_by = excluded.marked_by`).bind(id, validId(item.memberId), date, item.present ? 1 : 0)));
    return attendanceJson({ ok: true, team: await loadTeam(context.env.DB, id, date), date });
  } catch { return attendanceJson({ ok: false, error: "Could not save attendance." }, 500); }
}

export async function onRequestPatch(context) {
  const auth = await requireAttendanceSession(context); if (auth.response) return auth.response;
  const id = validId(context.params.id); if (!id) return attendanceJson({ ok: false, error: "Invalid team." }, 400);
  let body; try { body = await context.request.json(); } catch { return attendanceJson({ ok: false, error: "Invalid request." }, 400); }
  const memberId = validId(body?.leadMemberId); if (!memberId) return attendanceJson({ ok: false, error: "Choose a valid team lead." }, 400);
  try {
    const member = await context.env.DB.prepare("SELECT id FROM hackathon_team_members WHERE id = ? AND team_id = ?").bind(memberId, id).first();
    if (!member) return attendanceJson({ ok: false, error: "That member is not part of this team." }, 400);
    await context.env.DB.prepare("UPDATE hackathon_teams SET attendance_lead_member_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND submitted_at IS NOT NULL").bind(memberId, id).run();
    const team = await loadTeam(context.env.DB, id, new Date().toISOString().slice(0, 10));
    return attendanceJson({ ok: true, team });
  } catch { return attendanceJson({ ok: false, error: "Could not update the team lead." }, 500); }
}
