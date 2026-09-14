import { attendanceJson, requireAttendanceSession } from "../../_shared/attendance.js";
export const DIRECTORY_SQL = `SELECT t.id,t.team_code,t.team_name,t.team_size,
 COALESCE(lead.full_name,captain.full_name,'') lead_name, captain.full_name captain_name,
 (SELECT COUNT(*) FROM hackathon_team_members m JOIN hackathon_attendance a ON a.id=(SELECT latest.id FROM hackathon_attendance latest WHERE latest.team_id=t.id AND latest.member_id=m.id ORDER BY latest.attendance_date DESC,latest.marked_at DESC,latest.id DESC LIMIT 1) WHERE m.team_id=t.id AND a.present=1) present_count
 FROM hackathon_teams t
 LEFT JOIN hackathon_team_members lead ON lead.id=t.attendance_lead_member_id AND lead.team_id=t.id
 LEFT JOIN hackathon_team_members captain ON captain.team_id=t.id AND captain.role='Captain'
 WHERE t.submitted_at IS NOT NULL ORDER BY lower(t.team_name),t.id`;
export async function onRequestGet(context) {
 const auth=await requireAttendanceSession(context);if(auth.response)return auth.response;
 try {
  const result=await context.env.DB.prepare(DIRECTORY_SQL).bind().all();
  return attendanceJson({ok:true,teams:result.results||[],syncedAt:new Date().toISOString()});
 }catch{return attendanceJson({ok:false,error:'Could not refresh teams.'},500);}
}
