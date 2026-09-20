import { attendanceJson, requireAttendanceSession } from '../../_shared/attendance.js';
export async function onRequestGet(context) {
  const auth=await requireAttendanceSession(context); if(auth.response) return auth.response;
  const id=Number(new URL(context.request.url).searchParams.get('teamId'));
  if(!Number.isSafeInteger(id)||id<1) return attendanceJson({ok:false,error:'Invalid team.'},400);
  try {
    const rows=await context.env.DB.prepare(`SELECT member_id,name,status,detail,
      CASE WHEN status='sending' AND attempted_at < datetime('now','-2 minutes') THEN 1 ELSE 0 END interrupted
      FROM stock_checkin_deliveries WHERE team_id=? ORDER BY id`).bind(id).all();
    return attendanceJson({ok:true,deliveries:(rows.results||[]).map(row=>({...row,status:row.interrupted?'uncertain':row.status}))});
  } catch { return attendanceJson({ok:false,error:'Could not load API delivery status.'},500); }
}
