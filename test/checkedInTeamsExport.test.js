import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {createCheckedInTeamsWorkbook,createCheckedInParticipantsWorkbook} from '../src/services/registrationExport.js';
test('checked-in export groups by team identity, including duplicate team names',async()=>{
 const people=[{team_id:1,team_name:'Same name',team_code:'T1',team_size:3,lead_name:'Leader A',full_name:'Leader A'},{team_id:1,team_name:'Same name',team_code:'T1',team_size:3,lead_name:'Leader A',full_name:'Member B'},{team_id:2,team_name:'Same name',team_code:'T2',team_size:2,lead_name:'Leader C',full_name:'Leader C'}];
 const xml=async(fn)=>strFromU8(unzipSync((await fn(people)).bytes)['xl/worksheets/sheet1.xml']);
 const grouped=await xml(createCheckedInTeamsWorkbook);
 assert.equal((grouped.match(/<row /g)||[]).length,3);
 assert.match(grouped,/Leader A, Member B/);assert.match(grouped,/T2/);assert.match(grouped,/Checked-in Members/);
 assert.equal(((await xml(createCheckedInParticipantsWorkbook)).match(/<row /g)||[]).length,4);
 await assert.rejects(createCheckedInTeamsWorkbook([]),/no checked-in teams/);
});
