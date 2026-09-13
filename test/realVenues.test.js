import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixture, context } from './venueFixture.js';
import { onRequestPost as attendance } from '../functions/api/attendance/teams/[id].js';
import { onRequestPost as manual, onRequestPatch as reallocate } from '../functions/api/attendance/venues.js';
const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
const payload = count => ({date:'2026-09-16',projectMode:'Starting from scratch',attendance:[11,12,13].map((memberId,i)=>({memberId,present:i<count,mealPreference:'Veg'}))});
function migrate(f, withJudge = false) {
 f.sqlite.exec(read('db/migrations/0021_judging_admin.sql'));
 if(withJudge) {
  f.sqlite.exec("INSERT INTO judging_judges(id,name,solution_type) VALUES('judge','Judge','Technical'); INSERT INTO judging_assignments(team_id,judge_id,table_id,visit_order,assigned_by) SELECT team_id,'judge',table_id,1,'staff' FROM venue_allocations;");
 }
 f.sqlite.exec('BEGIN');
 try { f.sqlite.exec(read('db/migrations/0025_real_venue_plan.sql')); f.sqlite.exec('COMMIT'); }
 catch(e) { f.sqlite.exec('ROLLBACK'); throw e; }
}
test('real inventory includes every source table, capacity and category and clears dummy assignments while preserving attendance',async()=>{
 const f=fixture();
 try {
  await attendance(context(f.DB,payload(3)));
  const before=f.sqlite.prepare('SELECT * FROM venue_allocations').get();
  const attendanceBefore=f.sqlite.prepare('SELECT * FROM hackathon_attendance').all();
  migrate(f,true);
  const plan=JSON.parse(read('db/real-venues.json')).map(v=>({...v,name:v.name.replace('CCF','CFF'),category:['2nd Corridor','3rd Corridor','CFF Seminar hall','CCF Seminar hall','Incubation'].includes(v.name)?'Non-Technical':'Technical'}));
  const rows=f.sqlite.prepare('SELECT r.name,r.solution_type,t.table_number,t.seats FROM venue_tables t JOIN venue_rooms r ON r.id=t.room_id ORDER BY t.table_number').all();
  const expected=plan.flatMap(v=>Array.from({length:v.end-v.start+1},(_,i)=>({name:v.name,solution_type:v.category,table_number:v.start+i,seats:v.seats})));
  assert.deepEqual(rows.map(r=>({...r})),expected);
  assert.equal(rows.length,568);
  assert.equal(new Set(rows.map(r=>r.name)).size,23);
  assert.equal(rows.filter(r=>r.solution_type==='Technical').length,433);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM venue_allocations').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM judging_assignments').get().n,0);
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM venue_plan_0025_allocations').get(),before);
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM hackathon_attendance').all(),attendanceBefore);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{f.sqlite.close();}
});
test('real plan falls back within category across all sectors and modes; manual moves enforce category and capacity',async()=>{
 const f=fixture();
 try {
  migrate(f);
  f.sqlite.exec("UPDATE hackathon_teams SET sector_track='Healthcare';");
  assert.equal((await (await attendance(context(f.DB,payload(2)))).json()).team.allocation.table_id,10106);
  f.sqlite.exec('DELETE FROM venue_allocations; DELETE FROM venue_tables WHERE seats=2;');
  assert.equal((await (await attendance(context(f.DB,payload(2)))).json()).team.allocation.table_id,10091);
  f.sqlite.exec('DELETE FROM venue_allocations; DELETE FROM venue_tables WHERE seats=3;');
  assert.equal((await (await attendance(context(f.DB,payload(2)))).json()).team.allocation.table_id,10001);
  assert.equal((await reallocate(context(f.DB,{teamId:1,currentTableId:10001,tableId:10146},'PATCH'))).status,409);
  f.sqlite.exec('DELETE FROM venue_allocations; DELETE FROM venue_tables WHERE room_id IN (SELECT id FROM venue_rooms WHERE solution_type=\'Technical\');');
  assert.equal((await (await attendance(context(f.DB,payload(2)))).json()).team.allocation.table_id,null);
  assert.equal((await manual(context(f.DB,{teamId:1,tableId:10146}))).status,409);
  f.sqlite.exec("UPDATE hackathon_teams SET solution_type='Non-Technical'");
  assert.equal((await (await attendance(context(f.DB,payload(2)))).json()).team.allocation.table_id,10146);
 }finally{f.sqlite.close();}
});

test('exhibition split applies to automatic, manual and reallocation across sectors', async()=>{
 const f=fixture();
 try {
  migrate(f);
  f.sqlite.exec(read('db/migrations/0026_exhibition_allocation.sql'));
  const plan=JSON.parse(read('db/real-venues.json'));
  assert.deepEqual(f.sqlite.prepare('SELECT id,name,solution_type category,project_mode projectMode FROM venue_rooms ORDER BY id').all().map(r=>({...r})),plan.map(({id,name,category,projectMode})=>({id,name,category,projectMode})));
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM venue_tables').get().n,568);
  const check=async(mode,count=2)=>await (await attendance(context(f.DB,{...payload(count),projectMode:mode}))).json();
  let result=await check('Prepared');
  assert.equal(result.team.allocation.table_id,10146);
  assert.equal((await reallocate(context(f.DB,{teamId:1,currentTableId:10146,tableId:10106},'PATCH'))).status,409);
  result=await check('Starting from scratch');
  assert.equal(result.team.allocation.table_id,10106);
  assert.equal((await reallocate(context(f.DB,{teamId:1,currentTableId:10106,tableId:10146},'PATCH'))).status,409);
  f.sqlite.exec("UPDATE hackathon_teams SET solution_type='Non-Technical',sector_track='Healthcare'");
  result=await check('Prepared');
  assert.equal(result.team.allocation.table_id,10316);
  result=await check('Starting from scratch');
  assert.equal(result.team.allocation.table_id,10316);
  f.sqlite.exec("DELETE FROM venue_allocations; UPDATE hackathon_teams SET solution_type='Technical'; DELETE FROM venue_tables WHERE room_id IN (SELECT id FROM venue_rooms WHERE project_mode='Prepared');");
  result=await check('Prepared');
  assert.equal(result.team.allocation.table_id,null);
  assert.equal((await manual(context(f.DB,{teamId:1,tableId:10106}))).status,409);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{f.sqlite.close();}
});
