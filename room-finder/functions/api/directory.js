import {authenticated,json} from '../../shared/session.js';
export const DIRECTORY_SQL = `SELECT t.id,t.team_name,t.team_code,
 (SELECT full_name FROM hackathon_team_members m WHERE m.team_id=t.id AND m.role='Captain' LIMIT 1) captain,
 (SELECT full_name FROM hackathon_team_members m WHERE m.id=t.attendance_lead_member_id AND m.team_id=t.id) leader
 FROM hackathon_teams t WHERE t.submitted_at IS NOT NULL ORDER BY lower(t.team_name),t.id`;
export async function onRequest(context) {
 if(context.request.method!=='GET') return json({ok:false,error:'Method not allowed.'},405);
 if(!await authenticated(context)) return json({ok:false,error:'Please sign in.'},401);
 try {
  const {results}=await context.env.DB.prepare(DIRECTORY_SQL).all();
  return json({ok:true,teams:results,syncedAt:new Date().toISOString()});
 } catch {return json({ok:false,error:'Could not refresh the directory. Try again when connected.'},503);}
}
