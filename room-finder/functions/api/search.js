import {authenticated,json} from '../../shared/session.js';
// Scope attendance work to the selected team's members before aggregating.
export const ROOM_SQL = `WITH members AS (
 SELECT m.id,m.role,a.present FROM hackathon_team_members m
 LEFT JOIN hackathon_attendance a ON a.id=(SELECT aa.id FROM hackathon_attendance aa
 WHERE aa.team_id=m.team_id AND aa.member_id=m.id ORDER BY aa.attendance_date DESC,aa.marked_at DESC,aa.id DESC LIMIT 1)
 WHERE m.team_id=?
 ) SELECT t.id,t.team_name,t.team_code,
 (SELECT full_name FROM hackathon_team_members WHERE team_id=t.id AND role='Captain' LIMIT 1) captain,
 (SELECT COUNT(*) FROM members WHERE present IS NOT NULL)>0 attendance_marked,
 (SELECT COUNT(*) FROM members WHERE present=1) present_count,
 (SELECT COUNT(*) FROM members WHERE present=1 AND id=COALESCE(t.attendance_lead_member_id,
 (SELECT id FROM members WHERE role='Captain' LIMIT 1)))>0 lead_present,
 c.project_mode,r.name room,r.block,vt.table_number,vt.seats
 FROM hackathon_teams t LEFT JOIN venue_checkins c ON c.team_id=t.id
 LEFT JOIN venue_allocations a ON a.team_id=t.id LEFT JOIN venue_tables vt ON vt.id=a.table_id
 LEFT JOIN venue_rooms r ON r.id=vt.room_id WHERE t.id=? AND t.submitted_at IS NOT NULL`;
export async function onRequest(context) {
 if(context.request.method!=='GET') return json({ok:false,error:'Method not allowed.'},405);
 if(!await authenticated(context)) return json({ok:false,error:'Please sign in.'},401);
 const raw=new URL(context.request.url).searchParams.get('id')||'';
 const id=Number(raw);
 if(!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(id)) return json({ok:false,error:'Select a team. Refresh this page if needed.'},400);
 try {
  const team=await context.env.DB.prepare(ROOM_SQL).bind(id,id).first();
  if(!team)return json({ok:false,error:'Team no longer available. Refresh the directory.'},404);
  return json({ok:true,team});
 } catch {return json({ok:false,error:'Cannot verify the current room. Check your connection and try again.'},503);}
}
