import { getSession } from '../../_shared/auth.js';

export const CHECKED_IN_SQL = `SELECT m.id, m.full_name, m.role, t.id AS team_id, t.team_size, t.team_name, t.team_code,
 t.sector_track, t.solution_type, a.marked_at, r.name AS room_name, vt.table_number
 FROM hackathon_teams t JOIN hackathon_team_members m ON m.team_id=t.id
 JOIN hackathon_attendance a ON a.id=(SELECT latest.id FROM hackathon_attendance latest
 WHERE latest.team_id=t.id AND latest.member_id=m.id
 ORDER BY latest.attendance_date DESC, latest.marked_at DESC, latest.id DESC LIMIT 1)
 LEFT JOIN venue_allocations va ON va.team_id=t.id
 LEFT JOIN venue_tables vt ON vt.id=va.table_id LEFT JOIN venue_rooms r ON r.id=vt.room_id
 WHERE t.submitted_at IS NOT NULL AND a.present=1
 ORDER BY t.team_name, m.member_order`;
export const JUDGES_SQL = `SELECT j.id AS judge_id, j.name AS judge_name, j.solution_type,
 a.team_id, a.visit_order, t.team_name, t.team_code, t.sector_track,
 r.name AS room_name, vt.table_number
 FROM judging_judges j LEFT JOIN judging_assignments a ON a.judge_id=j.id
 LEFT JOIN hackathon_teams t ON t.id=a.team_id
 LEFT JOIN venue_tables vt ON vt.id=a.table_id LEFT JOIN venue_rooms r ON r.id=vt.room_id
 ORDER BY j.name, j.id, a.visit_order`;
function json(data, status=200) {
 return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json', 'cache-control':'no-store'}});
}
export async function onRequestGet(context) {
 const session = await getSession(context);
 if (!session) return json({ok:false,error:'Authentication required.'},401);
 if (!['read','write'].includes(session.registrationsAccess)) return json({ok:false,error:'Admin registration access required.'},403);
 const view = new URL(context.request.url).searchParams.get('view');
 if (!['checked-in','judges-allocation'].includes(view)) return json({ok:false,error:'Invalid report.'},400);
 try {
  const {results} = await context.env.DB.prepare(view === 'checked-in' ? CHECKED_IN_SQL : JUDGES_SQL).all();
  return json({ok:true,rows:results || []});
 } catch { return json({ok:false,error:'Could not load this report. Try refreshing again.'},500); }
}
