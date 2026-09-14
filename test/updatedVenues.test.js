import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,context} from './venueFixture.js';
import {onRequestPost as checkin} from '../functions/api/attendance/teams/[id].js';
import {onRequestPatch as move} from '../functions/api/attendance/venues.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const plan=JSON.parse(read('db/real-venues.json'));
const migrate=f=>{f.sqlite.exec(read('db/migrations/0031_updated_table_numbering.sql'));f.sqlite.exec(read('db/migrations/0032_rs504_exhibition.sql'));f.sqlite.exec(read('db/migrations/0034_rebalance_exhibition.sql'));};
function setup(){const f=fixture();f.sqlite.exec(read('db/migrations/0021_judging_admin.sql'));f.sqlite.exec('BEGIN');f.sqlite.exec(read('db/migrations/0025_real_venue_plan.sql'));f.sqlite.exec('COMMIT');migrate(f);return f;}
test('updated numbering has 568 unique tables in 24 rooms and exact capacities',()=>{const f=setup();try{
 const rows=f.sqlite.prepare('SELECT r.name,r.solution_type category,r.project_mode projectMode,t.table_number number,t.seats FROM venue_tables t JOIN venue_rooms r ON r.id=t.room_id ORDER BY t.table_number').all().map(r=>({...r}));
 assert.deepEqual(rows,plan.flatMap(v=>Array.from({length:v.end-v.start+1},(_,i)=>({name:v.name,category:v.category,projectMode:v.projectMode,number:v.start+i,seats:v.seats}))));
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:568},(_,i)=>i+1));assert.equal(plan.length,24);
 assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
}finally{f.sqlite.close();}});
test('both categories separate prepared and scratch, including manual moves and full exhibition rooms',async()=>{for(const side of ['Technical','Non-Technical']){const f=setup();try{
 f.sqlite.prepare('UPDATE hackathon_teams SET solution_type=?,sector_track=?').run(side,'Healthcare');
 const save=async mode=>{const r=await checkin(context(f.DB,{date:'2026-09-16',projectMode:mode,attendance:[11,12,13].map(memberId=>({memberId,present:memberId!==13}))}));assert.equal(r.status,200);return (await r.json()).team.allocation;};
 for(const mode of ['Prepared','Starting from scratch']){
 const a=await save(mode);assert.ok(a.table_id);
 const room=f.sqlite.prepare('SELECT r.* FROM venue_rooms r JOIN venue_tables t ON t.room_id=r.id WHERE t.id=?').get(a.table_id);assert.equal(room.solution_type,side);assert.equal(room.project_mode,mode);
 const wrong=f.sqlite.prepare('SELECT t.id FROM venue_tables t JOIN venue_rooms r ON r.id=t.room_id WHERE r.solution_type=? AND r.project_mode<>? LIMIT 1').get(side,mode);
 assert.equal((await move(context(f.DB,{teamId:1,currentTableId:a.table_id,tableId:wrong.id},'PATCH'))).status,409);
 }
 f.sqlite.exec("DELETE FROM venue_allocations; DELETE FROM venue_tables WHERE room_id IN (SELECT id FROM venue_rooms WHERE project_mode='Prepared');");
 assert.equal((await save('Prepared')).table_id,null);
}finally{f.sqlite.close();}}});
test('inventory replacement refuses to remove active allocations',async()=>{const f=setup();try{
 await checkin(context(f.DB,{date:'2026-09-16',projectMode:'Prepared',attendance:[11,12,13].map(memberId=>({memberId,present:true}))}));
 f.sqlite.exec('DROP TABLE venue_plan_0031_rooms; DROP TABLE venue_plan_0031_tables; DROP TABLE venue_plan_0031_room_order; BEGIN');assert.throws(()=>migrate(f));f.sqlite.exec('ROLLBACK');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM venue_allocations').get().n,1);
}finally{f.sqlite.close();}});
