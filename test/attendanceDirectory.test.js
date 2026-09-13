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
