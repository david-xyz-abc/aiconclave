import {authenticated,json} from '../../shared/session.js';
export const SEARCH_SQL = `SELECT q.team_name,q.team_code,q.attendance_marked,q.present_count,q.lead_present,q.project_mode,
 (SELECT full_name FROM hackathon_team_members m WHERE m.team_id=q.team_id AND m.role='Captain' LIMIT 1) captain,
 r.name room,r.block,t.table_number,t.seats
 FROM venue_requirements q LEFT JOIN venue_allocations a ON a.team_id=q.team_id
 LEFT JOIN venue_tables t ON t.id=a.table_id LEFT JOIN venue_rooms r ON r.id=t.room_id
 WHERE instr(lower(q.team_name),lower(?))>0 OR instr(lower(q.team_code),lower(?))>0
 OR EXISTS(SELECT 1 FROM hackathon_team_members m WHERE m.team_id=q.team_id AND
 (m.role='Captain' OR m.id=(SELECT attendance_lead_member_id FROM hackathon_teams WHERE id=q.team_id))
 AND instr(lower(m.full_name),lower(?))>0)
 ORDER BY lower(q.team_name),q.team_id LIMIT 21`;
export async function onRequest(context) {
 if(context.request.method!=='GET') return json({ok:false,error:'Method not allowed.'},405);
 if(!await authenticated(context)) return json({ok:false,error:'Please sign in.'},401);
 const q=(new URL(context.request.url).searchParams.get('q')||'').trim();
 if(q.length<2 || q.length>100) return json({ok:false,error:'Enter 2–100 characters.'},400);
 try {
  const {results}=await context.env.DB.prepare(SEARCH_SQL).bind(q,q,q).all();
  return json({ok:true,more:results.length>20,teams:results.slice(0,20)});
 } catch {return json({ok:false,error:'Could not find rooms. Please try again.'},503);}
}
