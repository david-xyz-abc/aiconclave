import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './venueFixture.js';
import {onRequestGet as overview} from '../functions/api/attendance/rooms.js';
import {onRequestGet as detail} from '../functions/api/attendance/rooms/[id].js';
test('overview reads counts only; room details query just one room and reflects assignments',async()=>{
 const f=fixture();const queries=[];
 const DB={prepare(sql){if(!sql.includes('attendance_sessions'))queries.push(sql);return f.DB.prepare(sql);}};
 const context=id=>({env:{DB},params:{id:String(id)},request:new Request('https://test.example/api/attendance/rooms',{headers:{cookie:'__Host-aiconclave_attendance_session=test'}})});
 try{
 const summary=await (await overview(context())).json();
 assert.equal(queries.length,1);assert.ok(!queries[0].includes('hackathon_teams'));assert.ok(!queries[0].includes('hackathon_attendance'));
 const room=summary.rooms[0];assert.ok(room.table_count>0);assert.equal(room.occupied_count,0);
 assert.equal('team_name' in room,false);
 queries.length=0;
 let d=await (await detail(context(room.id))).json();assert.equal(queries.length,1);assert.equal(d.tables.length,room.table_count);
 assert.equal(d.tables.every(t=>!t.team_id),true);
 f.sqlite.prepare("INSERT INTO venue_allocations(team_id,table_id,assigned_by) VALUES(1,?,'test')").run(d.tables[0].table_id);
 d=await (await detail(context(room.id))).json();assert.equal(d.tables.filter(t=>t.team_id).length,1);assert.equal(d.tables[0].team_name,'Git-R-Done');
 assert.equal((await (await overview(context())).json()).rooms[0].occupied_count,1);
 assert.equal((await detail(context('1 OR 1=1'))).status,400);
 }finally{f.sqlite.close();}
});
test('room endpoints reject accounts without check-in access',async()=>{
 const f=fixture('none');try{
 const ctx={env:{DB:f.DB},params:{id:'1'},request:new Request('https://test.example',{headers:{cookie:'__Host-aiconclave_attendance_session=test'}})};
 assert.equal((await overview(ctx)).status,403);assert.equal((await detail(ctx)).status,403);
 }finally{f.sqlite.close();}
});
