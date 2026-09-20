import {attendanceJson,requireAttendanceSession} from '../../../_shared/attendance.js';
export const TABLES_SQL=`SELECT t.id table_id,t.table_number,t.seats,a.team_id,h.team_name,h.team_code
 FROM venue_tables t LEFT JOIN venue_allocations a ON a.table_id=t.id
 LEFT JOIN hackathon_teams h ON h.id=a.team_id WHERE t.room_id=? AND t.table_number NOT BETWEEN 552 AND 568 ORDER BY t.table_number`;
export async function onRequestGet(context){
 const auth=await requireAttendanceSession(context);if(auth.response)return auth.response;
 if(!['read','write'].includes(auth.session.attendance_access))return attendanceJson({ok:false,error:'Check-in access required.'},403);
 const raw=String(context.params.id||'');const id=Number(raw);
 if(!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(id))return attendanceJson({ok:false,error:'Invalid room.'},400);
 try{const {results}=await context.env.DB.prepare(TABLES_SQL).bind(id).all();return attendanceJson({ok:true,tables:results||[],updatedAt:new Date().toISOString()});}
 catch{return attendanceJson({ok:false,error:'Could not load this room. Try again.'},500);}
}
