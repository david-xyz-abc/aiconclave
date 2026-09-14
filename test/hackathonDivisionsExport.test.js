import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync, strFromU8} from 'fflate';
import {createHackathonDivisionsWorkbook,createRegistrationsWorkbook} from '../src/services/registrationExport.js';
const teams = [
 {record_type:'team',team_name:'Tech team',team_code:'T001',solution_type:'Technical',members:[{full_name:'=NOT_A_FORMULA()',role:'Captain',member_order:1},{full_name:'Second member',role:'Member',member_order:2}]},
 {record_type:'team',team_name:'Nontech team',team_code:'N001',solution_type:'Non-Technical',members:[{full_name:'Nontech captain',role:'Captain',member_order:1}]},
];
test('division workbook separates sides and preserves all members as text',async()=>{
 const {bytes}=await createHackathonDivisionsWorkbook(teams);
 const zip=unzipSync(bytes);const xml=p=>strFromU8(zip[p]);
 assert.match(xml('xl/workbook.xml'),/name="Technical"/);assert.match(xml('xl/workbook.xml'),/name="Non-Technical"/);
 const tech=xml('xl/worksheets/sheet1.xml'),nontech=xml('xl/worksheets/sheet2.xml');
 assert.match(tech,/Second member/);assert.match(tech,/T001/);assert.doesNotMatch(tech,/Nontech captain/);
 assert.match(nontech,/Nontech captain/);assert.doesNotMatch(nontech,/Second member/);
 assert.match(tech,/=NOT_A_FORMULA\(\)/);assert.doesNotMatch(tech,/<f[ >]/);
 assert.match(tech,/ySplit="1"/);assert.doesNotMatch(tech,/<mergeCells|AI CONCLAVE|s="[134]"/);
 assert.match(tech,/state="frozen"/);assert.match(tech,/<autoFilter/);
});
test('complete export retains team overview and every member; empty division remains a valid sheet',async()=>{
 const all=unzipSync((await createRegistrationsWorkbook('hackathon',teams)).bytes);
 assert.match(strFromU8(all['xl/workbook.xml']),/Team Members/);
 for(const name of ['Second member','Nontech captain']) assert.match(strFromU8(all['xl/worksheets/sheet2.xml']),new RegExp(name));
 const one=unzipSync((await createHackathonDivisionsWorkbook(teams.slice(0,1))).bytes);
 assert.match(strFromU8(one['xl/workbook.xml']),/Non-Technical/);
 await assert.rejects(createHackathonDivisionsWorkbook([{...teams[0],solution_type:'Unknown'}]),/unrecognized/);
});
