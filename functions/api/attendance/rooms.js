import {attendanceJson,requireAttendanceSession} from '../../_shared/attendance.js';
export const ROOMS_SQL=`SELECT r.id,r.name,r.block,r.solution_type,r.project_mode,
 COUNT(t.id) table_count,COUNT(a.table_id) occupied_count,
 SUM(CASE WHEN t.seats=2 THEN 1 ELSE 0 END) seats_2,
 SUM(CASE WHEN t.seats=3 THEN 1 ELSE 0 END) seats_3,
 SUM(CASE WHEN t.seats=4 THEN 1 ELSE 0 END) seats_4
 FROM venue_rooms r LEFT JOIN venue_tables t ON t.room_id=r.id AND t.table_number NOT BETWEEN 552 AND 568
 LEFT JOIN venue_allocations a ON a.table_id=t.id GROUP BY r.id ORDER BY r.id`;
export async function onRequestGet(context){
 const auth=await requireAttendanceSession(context);if(auth.response)return auth.response;
 if(!['read','write'].includes(auth.session.attendance_access))return attendanceJson({ok:false,error:'Check-in access required.'},403);
 try{const {results}=await context.env.DB.prepare(ROOMS_SQL).all();return attendanceJson({ok:true,rooms:results||[],syncedAt:new Date().toISOString()});}
 catch{return attendanceJson({ok:false,error:'Could not refresh rooms.'},500);}
}
