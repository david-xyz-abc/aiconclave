import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/attendance/teams.js';
import {filterTeams,readTeamDirectory} from '../src/features/attendance/teamDirectory.js';
import {fixture} from './venueFixture.js';

test('directory uses one compact data query without scanning attendance; searching is local',async()=>{
 const f=fixture();const queries=[];
 const DB={prepare(sql){if(!sql.includes('attendance_sessions'))queries.push(sql);return f.DB.prepare(sql);}};
 try{
 const response=await onRequestGet({env:{DB},request:new Request('https://test.example/api/attendance/teams',{headers:{cookie:'__Host-aiconclave_attendance_session=test'}})});
 assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.teams.length,1);assert.ok(data.syncedAt);
 assert.equal(queries.length,1);assert.ok(!queries[0].includes('hackathon_attendance'));
 assert.equal('present_count' in data.teams[0],false);assert.equal('email' in data.teams[0],false);
 for(const query of ['Git-R','aic-1','captain'])assert.equal(filterTeams(data.teams,query).length,1);
 assert.equal(filterTeams(data.teams,'unknown').length,0);assert.equal(queries.length,1);
 assert.deepEqual(readTeamDirectory({getItem:()=>JSON.stringify(data)}),data);
 assert.equal(readTeamDirectory({getItem:()=>'{broken'}),null);
 }finally{f.sqlite.close();}
});

test('checked-in summary skips roster and history; Edit explicitly loads full details',async()=>{
 const {onRequestGet:getTeam}=await import('../functions/api/attendance/teams/[id].js');
 const f=fixture();const queries=[];
 const DB={prepare(sql){if(!sql.includes('attendance_sessions'))queries.push(sql);return f.DB.prepare(sql);}};
 const get=async(full=false)=>await getTeam({env:{DB},params:{id:'1'},request:new Request('https://test.example/api/attendance/teams/1'+(full?'?full=1':''),{headers:{cookie:'__Host-aiconclave_attendance_session=test'}})});
 try{
 let data=await (await get()).json();assert.equal(data.team.members.length,3);assert.equal(data.team.summary_only,false);
 f.sqlite.exec("INSERT INTO hackathon_attendance(team_id,member_id,attendance_date,present,meal_preference) VALUES(1,11,'2026-09-16',1,'Veg'),(1,12,'2026-09-16',1,'Non-Veg'),(1,13,'2026-09-16',0,NULL)");
 queries.length=0;
 data=await (await get()).json();assert.equal(data.team.summary_only,true);assert.equal(data.team.attendance_marked,true);
 assert.equal('members' in data.team,false);assert.equal('attendance_dates' in data.team,false);
 assert.equal(queries.length,1);assert.equal(queries.some(q=>q.includes('hackathon_team_members')),false);
 queries.length=0;
 data=await (await get(true)).json();assert.equal(data.team.members.length,3);assert.equal(data.team.summary_only,false);
 assert.equal(data.team.allocation.present_count,2);assert.equal(data.team.allocation.lead_present,1);
 assert.equal(data.team.members[1].meal_preference,'Non-Veg');assert.equal(queries.length,3);
 }finally{f.sqlite.close();}
});
