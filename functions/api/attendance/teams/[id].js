import { allocationStatements } from "../../../_shared/allocation.js";
import { attendanceJson, requireAttendanceAdmin, requireAttendanceSession } from "../../../_shared/attendance.js";

function validId(value) { const id = Number.parseInt(value, 10); return Number.isInteger(id) && id > 0 ? id : null; }
function validDate(value) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }

export async function loadTeam(db, id, date, full = true) {
  const row = await db.prepare(`SELECT t.id,t.team_code,t.team_name,t.participant_category,t.sector_track,t.solution_type,t.team_size,t.checkin_version,
    t.attendance_lead_member_id AS lead_member_id,
    EXISTS(SELECT 1 FROM hackathon_attendance WHERE team_id=t.id) attendance_marked,
    c.project_mode,a.table_id,r.name room_name,r.block,vt.table_number,vt.seats table_seats
    FROM hackathon_teams t LEFT JOIN venue_checkins c ON c.team_id=t.id
    LEFT JOIN venue_allocations a ON a.team_id=t.id LEFT JOIN venue_tables vt ON vt.id=a.table_id
    LEFT JOIN venue_rooms r ON r.id=vt.room_id WHERE t.id=? AND t.submitted_at IS NOT NULL`).bind(id).first();
  if (!row) return null;
  const {project_mode,table_id,room_name,block,table_number,table_seats,...team}=row;
  const allocation={project_mode,table_id,room_name,block,table_number,table_seats};
  if(!full && row.attendance_marked) return {...team,attendance_marked:true,summary_only:true,allocation};
  const result = await db.prepare(`SELECT m.id,m.full_name,m.email,m.institution,m.role,a.meal_preference,
    CASE WHEN a.present=1 THEN 1 ELSE 0 END present FROM hackathon_team_members m
    LEFT JOIN hackathon_attendance a ON a.id=(SELECT aa.id FROM hackathon_attendance aa
    WHERE aa.member_id=m.id AND aa.team_id=m.team_id ORDER BY aa.attendance_date DESC,aa.marked_at DESC,aa.id DESC LIMIT 1)
    WHERE m.team_id=? ORDER BY m.member_order`).bind(id).all();
  const members=(result.results||[]).map(m=>({...m,meal_preference:m.present?m.meal_preference??null:null}));
  const lead_member_id=team.lead_member_id??members.find(m=>m.role==='Captain')?.id;
  const dates=await db.prepare('SELECT DISTINCT attendance_date FROM hackathon_attendance WHERE team_id=? ORDER BY attendance_date DESC').bind(id).all();
  return {...team,lead_member_id,summary_only:false,attendance_marked:Boolean(team.attendance_marked),member_count:members.length,members,
    attendance_dates:(dates.results||[]).map(r=>r.attendance_date),
    allocation:{...allocation,present_count:members.filter(m=>m.present).length,lead_present:members.some(m=>m.id===lead_member_id&&m.present)?1:0}};
}

export async function onRequestGet(context) {
  const auth = await requireAttendanceSession(context); if (auth.response) return auth.response;
  const id = validId(context.params.id); const date = validDate(new URL(context.request.url).searchParams.get("date")) || new Date().toISOString().slice(0, 10);
  if (!id) return attendanceJson({ ok: false, error: "Invalid team." }, 400);
  try { const team = await loadTeam(context.env.DB, id, date, new URL(context.request.url).searchParams.get('full') === '1'); return team ? attendanceJson({ ok: true, team, date }) : attendanceJson({ ok: false, error: "Team not found." }, 404); } catch { return attendanceJson({ ok: false, error: "Could not load this team." }, 500); }
}

export async function onRequestPost(context) {
  const auth = await requireAttendanceAdmin(context); if (auth.response) return auth.response;
  const id = validId(context.params.id); if (!id) return attendanceJson({ ok: false, error: "Invalid team." }, 400);
  let body; try { body = await context.request.json(); } catch { return attendanceJson({ ok: false, error: "Invalid request." }, 400); }
  if (!Number.isSafeInteger(body?.expectedVersion) || body.expectedVersion < 0) return attendanceJson({ ok:false, error:"This check-in form is out of date. Reload the team before saving." },409);
  const date = validDate(body?.date); const attendance = Array.isArray(body?.attendance) ? body.attendance : [];
  if (!date || !attendance.length || attendance.length > 20 || attendance.some((item) => !validId(item?.memberId))) return attendanceJson({ ok: false, error: "A valid date and member check-in list are required." }, 400);
  const memberIds = attendance.map((item) => validId(item.memberId));
  if (new Set(memberIds).size !== memberIds.length || attendance.some((item) => typeof item.present !== "boolean")) return attendanceJson({ ok: false, error: "Provide each member once with a valid check-in status." }, 400);
  const existing = await context.env.DB.prepare(`SELECT id FROM hackathon_team_members WHERE team_id = ? AND id IN (${memberIds.map(() => "?").join(",")})`).bind(id, ...memberIds).all();
  if ((existing.results || []).length !== new Set(memberIds).size) return attendanceJson({ ok: false, error: "One or more members do not belong to this team." }, 400);
  try {
    const currentTeam = await context.env.DB.prepare(`SELECT t.id,
 COALESCE(t.attendance_lead_member_id,(SELECT id FROM hackathon_team_members WHERE team_id=t.id AND role='Captain' LIMIT 1)) lead_member_id,
 (SELECT COUNT(*) FROM hackathon_team_members WHERE team_id=t.id) member_count
 FROM hackathon_teams t WHERE t.id=? AND t.submitted_at IS NOT NULL`).bind(id).first();
    if (!currentTeam) return attendanceJson({ ok: false, error: "Team not found." }, 404);
    const leadMemberId = body.leadMemberId === undefined ? currentTeam.lead_member_id : body.leadMemberId;
    if (!Number.isSafeInteger(leadMemberId) || !memberIds.includes(leadMemberId)) return attendanceJson({ok:false,error:"Choose a team lead from this team."},400);
    if (attendance.filter((item) => item.present === true).length < 2) {
      return attendanceJson({ ok: false, error: "At least two team members must be present to check in." }, 400);
    }
    if (!attendance.some((item) => Number(item.memberId) === Number(leadMemberId) && item.present === true)) {
      return attendanceJson({ ok: false, error: "The team lead must be present. Select a present member as team lead before saving check-in." }, 400);
    }
    if (attendance.some((item) => item.present && !['Veg', 'Non-Veg'].includes(item.mealPreference))) {
      return attendanceJson({ ok: false, error: "Choose Veg or Non-veg for each present member." }, 400);
    }
    if (!['Prepared', 'Starting from scratch'].includes(body.projectMode)) return attendanceJson({ ok: false, error: "Select Prepared or Starting from scratch." }, 400);
    if (currentTeam.member_count !== attendance.length) return attendanceJson({ ok: false, error: "Include every team member before saving." }, 400);
    await context.env.DB.batch([
      context.env.DB.prepare('INSERT INTO checkin_save_guards(team_id,expected_version) VALUES (?,?)').bind(id,body.expectedVersion),
      context.env.DB.prepare('UPDATE hackathon_teams SET attendance_lead_member_id=? WHERE id=?').bind(leadMemberId,id),
      ...attendance.map((item) => context.env.DB.prepare(`INSERT INTO hackathon_attendance (team_id, member_id, attendance_date, present, meal_preference, marked_by) VALUES (?, ?, ?, ?, ?, 'attendance-desk') ON CONFLICT(team_id, member_id, attendance_date) DO UPDATE SET present = excluded.present, meal_preference = excluded.meal_preference, marked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), marked_by = excluded.marked_by`).bind(id, validId(item.memberId), date, item.present ? 1 : 0, item.present ? item.mealPreference : null)), ...allocationStatements(context.env.DB, id, body.projectMode, auth.session.username), context.env.DB.prepare('DELETE FROM checkin_save_guards WHERE team_id=?').bind(id)]);
    return attendanceJson({ ok: true, team: await loadTeam(context.env.DB, id, date), date });
  } catch (error) {
    if (String(error?.message || error).includes('checkin_stale_version')) return attendanceJson({ok:false,error:"This team changed since you opened it. Reload the team and review the latest check-in before saving."},409);
    return attendanceJson({ ok: false, error: "Could not save check-in." }, 500);
  }
}

export async function onRequestPatch(context) {
  const auth = await requireAttendanceAdmin(context); if (auth.response) return auth.response;
  return attendanceJson({ok:false,error:"Reload the check-in page. Team lead changes must be saved together with check-in."},409);
}
