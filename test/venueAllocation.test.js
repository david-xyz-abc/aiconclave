import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture, context } from './venueFixture.js';
import { onRequestPost as attendance } from '../functions/api/attendance/teams/[id].js';
import { onRequestPost as manual, onRequestPatch as reallocate, onRequestGet, MANUAL_SQL, REALLOCATE_SQL } from '../functions/api/attendance/venues.js';
import { CLAIM_SQL } from '../functions/_shared/allocation.js';

const payload = (count = 3, projectMode = 'Prepared') => ({ date: '2026-09-16', projectMode, attendance: [11,12,13].map((memberId,i) => ({ memberId, present: i < count, mealPreference: 'Veg' })) });

test('reallocation atomically moves an assigned team and rejects stale staff requests', async () => {
 const f=fixture();
 try {
  await attendance(context(f.DB,payload()));
  const old=f.sqlite.prepare('SELECT table_id FROM venue_allocations WHERE team_id=1').get().table_id;
  const candidates=f.sqlite.prepare("SELECT vt.id FROM venue_tables vt JOIN venue_rooms r ON vt.room_id=r.id WHERE r.project_mode='Prepared' AND r.sector='Agriculture' AND r.solution_type='Technical' AND r.seats=3 AND vt.id<>? ORDER BY vt.id").all(old);
  const request={teamId:1,currentTableId:old,tableId:candidates[0].id};
  assert.equal((await reallocate(context(f.DB,request,'PATCH'))).status,200);
  assert.equal(f.sqlite.prepare('SELECT table_id FROM venue_allocations WHERE team_id=1').get().table_id,candidates[0].id);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM venue_allocations WHERE table_id=?').get(old).n,0);
  assert.equal((await reallocate(context(f.DB,{...request,tableId:candidates[1].id},'PATCH'))).status,409);
  assert.equal(f.sqlite.prepare('SELECT table_id FROM venue_allocations WHERE team_id=1').get().table_id,candidates[0].id);
  await attendance(context(f.DB,payload()));
  assert.equal(f.sqlite.prepare('SELECT table_id FROM venue_allocations WHERE team_id=1').get().table_id,candidates[0].id);
 } finally { f.sqlite.close(); }
});

test('failed reallocation retains the old table for incompatible, occupied and invalid targets', async () => {
 const f=fixture();
 try {
  await attendance(context(f.DB,payload()));
  const old=f.sqlite.prepare('SELECT table_id FROM venue_allocations WHERE team_id=1').get().table_id;
  const free=f.sqlite.prepare('SELECT id FROM venue_tables WHERE room_id=(SELECT room_id FROM venue_tables WHERE id=?) AND id<>? LIMIT 1').get(old,old).id;
  f.sqlite.exec("INSERT INTO hackathon_teams (id,submitted_at) VALUES (2,'2026-09-11')");
  f.sqlite.prepare("INSERT INTO venue_allocations VALUES (2,?,'other-staff','now')").run(free);
  for(const tableId of [free,99999,old,1]) {
   assert.equal((await reallocate(context(f.DB,{teamId:1,currentTableId:old,tableId},'PATCH'))).status,409);
   assert.equal(f.sqlite.prepare('SELECT table_id FROM venue_allocations WHERE team_id=1').get().table_id,old);
  }
  const ctx=context(f.DB,{teamId:1,currentTableId:old,tableId:free},'PATCH');
  ctx.request.headers.delete('origin');assert.equal((await reallocate(ctx)).status,403);
  ctx.request.headers.delete('cookie');assert.equal((await reallocate(ctx)).status,401);
  assert.equal((await reallocate(context(f.DB,{teamId:1,tableId:free},'PATCH'))).status,400);
 } finally {f.sqlite.close();}
 const read=fixture('read');try {assert.equal((await reallocate(context(read.DB,{teamId:1,currentTableId:1,tableId:2},'PATCH'))).status,403);}finally{read.sqlite.close();}
});

test('plan has 53 rooms, 565 tables, seven large rooms, and preserved table capacities', () => {
 const f = fixture();
 try {
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM venue_rooms').get().n,53);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM venue_tables').get().n,565);
  const sizes=f.sqlite.prepare('SELECT COUNT(*) AS n FROM venue_tables GROUP BY room_id').all();
  assert.equal(sizes.filter(r=>r.n===15).length,7);
  assert.equal(sizes.filter(r=>r.n===10).length,46);
 } finally { f.sqlite.close(); }
});

test('attendance allocates by mode, sector, solution, present count; repeated saves retain table', async () => {
 const f=fixture();
 try {
  let response=await attendance(context(f.DB,payload())); assert.equal(response.status,200);
  let team=(await response.json()).team;
  const first=team.allocation.table_id;
  assert.ok(first);
  const room=f.sqlite.prepare('SELECT r.* FROM venue_rooms r JOIN venue_tables t ON t.room_id=r.id WHERE t.id=?').get(first);
  assert.deepEqual([room.project_mode,room.sector,room.solution_type,room.seats],['Prepared','Agriculture','Technical',3]);
  response=await attendance(context(f.DB,payload())); assert.equal((await response.json()).team.allocation.table_id,first);
  response=await attendance(context(f.DB,payload(2,'Starting from scratch'))); assert.equal(response.status,200);
  team=(await response.json()).team; assert.notEqual(team.allocation.table_id,first);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM venue_allocations').get().n,1);
  assert.equal(team.allocation.present_count,2);
 } finally { f.sqlite.close(); }
});

test('missing mode and incomplete roster are rejected before writing', async () => {
 const f=fixture();
 try {
  for(const body of [payload(3,''),{...payload(),attendance:payload().attendance.slice(0,2)}]) {
   assert.equal((await attendance(context(f.DB,body))).status,400);
  }
  assert.equal(f.writes,0);
 } finally { f.sqlite.close(); }
});

test('no compatible table preserves attendance and creates a waiting team; manual assignment resolves it', async () => {
 const f=fixture();
 try {
  f.sqlite.exec('DELETE FROM venue_tables');
  const response=await attendance(context(f.DB,payload())); assert.equal(response.status,200);
  assert.equal((await response.json()).team.allocation.table_id,null);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM hackathon_attendance').get().n,3);
  const room=f.sqlite.prepare("SELECT id FROM venue_rooms WHERE project_mode='Prepared' AND sector='Agriculture' AND solution_type='Technical' AND seats=3 LIMIT 1").get();
  f.sqlite.prepare('INSERT INTO venue_tables VALUES (999,?,1,3)').run(room.id);
  assert.equal((await manual(context(f.DB,{teamId:1,tableId:999}))).status,200);
  assert.equal((await manual(context(f.DB,{teamId:1,tableId:999}))).status,409);
  const list=await onRequestGet(context(f.DB,null,'GET','venues')); assert.equal(list.status,200);
  assert.equal((await list.json()).teams[0].table_id,999);
 } finally { f.sqlite.close(); }
});

test('manual allocation rejects missing attendance, wrong category, absent auth and read-only writes', async () => {
 const f=fixture();
 try {
  assert.equal((await manual(context(f.DB,{teamId:1,tableId:1}))).status,409);
  await attendance(context(f.DB,payload()));
  f.sqlite.exec('DELETE FROM venue_allocations');
  const wrong=f.sqlite.prepare("SELECT vt.id FROM venue_tables vt JOIN venue_rooms r ON vt.room_id=r.id WHERE r.sector='Healthcare' LIMIT 1").get();
  assert.equal((await manual(context(f.DB,{teamId:1,tableId:wrong.id}))).status,409);
  const ctx=context(f.DB,{teamId:1,tableId:1});ctx.request.headers.delete('origin');
  assert.equal((await manual(ctx)).status,403);
  ctx.request.headers.delete('cookie');assert.equal((await manual(ctx)).status,401);
 } finally { f.sqlite.close(); }
 const read=fixture('read');try { assert.equal((await manual(context(read.DB,{teamId:1,tableId:1}))).status,403); } finally {read.sqlite.close();}
});

test('allocation failure rolls back attendance and mode together', async () => {
 const f=fixture();
 try {
  f.sqlite.exec("CREATE TRIGGER fail_assignment BEFORE INSERT ON venue_allocations BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  assert.equal((await attendance(context(f.DB,payload()))).status,500);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM hackathon_attendance').get().n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM venue_checkins').get().n,0);
 } finally { f.sqlite.close(); }
});

test('three real concurrent SQLite connections cannot double-book automatic or manual claims', async () => {
 const dir=mkdtempSync(join(tmpdir(),'venue-race-')),path=join(dir,'race.sqlite');
 const db=new DatabaseSync(path);
 try {
  db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE venue_requirements (team_id INTEGER, project_mode TEXT, sector_track TEXT, solution_type TEXT, present_count INTEGER, lead_present INTEGER, attendance_marked INTEGER);
   INSERT INTO venue_requirements VALUES (1,'Prepared','Agriculture','Technical',3,1,1),(2,'Prepared','Agriculture','Technical',3,1,1),(3,'Prepared','Agriculture','Technical',3,1,1);
   CREATE TABLE venue_rooms (id INTEGER, project_mode TEXT, sector TEXT, solution_type TEXT, seats INTEGER);
   INSERT INTO venue_rooms VALUES (1,'Prepared','Agriculture','Technical',3);
   CREATE TABLE venue_tables (id INTEGER,room_id INTEGER,table_number INTEGER,seats INTEGER);
   INSERT INTO venue_tables VALUES (1,1,1,3),(2,1,2,4);
   CREATE TABLE venue_allocations (team_id INTEGER PRIMARY KEY, table_id INTEGER UNIQUE, assigned_by TEXT, assigned_at TEXT);`);
  const race=sql=>Promise.all([1,2,3].map(id=>new Promise((resolve,reject)=>{
   const args=sql===CLAIM_SQL?['staff',id]:sql===REALLOCATE_SQL?[3,'staff',id,db.prepare('SELECT table_id FROM venue_allocations WHERE team_id=?').get(id)?.table_id || 99,3,3,3]:['staff',id,1];
   const worker=new Worker(`const {workerData,parentPort}=require('node:worker_threads'); const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(workerData.path); db.exec('PRAGMA busy_timeout=5000'); const r=db.prepare(workerData.sql).run(...workerData.args); db.close(); parentPort.postMessage(Number(r.changes));`,{eval:true,workerData:{path,sql,args}});
   worker.on('message',resolve);worker.on('error',reject);worker.on('exit',code=>{if(code)reject(new Error(`Worker exit ${code}`));});
  })));
  assert.equal((await race(CLAIM_SQL)).reduce((a,b)=>a+b),2);
  assert.equal(db.prepare('SELECT COUNT(DISTINCT table_id) AS n FROM venue_allocations').get().n,2);
  db.exec('INSERT INTO venue_tables VALUES (3,1,3,4)');
  assert.equal((await race(REALLOCATE_SQL)).reduce((a,b)=>a+b),1);
  assert.equal(db.prepare('SELECT COUNT(DISTINCT table_id) AS n FROM venue_allocations').get().n,2);
  db.exec('DELETE FROM venue_allocations');
  assert.equal((await race(MANUAL_SQL)).reduce((a,b)=>a+b),1);
 } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});

function mixedFixture() {
 const f = fixture();
 // Room 1's legacy room.seats is 2, but its tables now have independent capacities.
 f.sqlite.exec('DELETE FROM venue_tables; INSERT INTO venue_tables(id,room_id,table_number,seats) VALUES (901,1,1,4),(902,1,2,3),(903,1,3,2);');
 return f;
}
function occupy(f, id, tableId) {
 f.sqlite.prepare("INSERT INTO hackathon_teams(id,submitted_at) VALUES (?,'2026-09-11')").run(id);
 f.sqlite.prepare("INSERT INTO venue_allocations(team_id,table_id,assigned_by) VALUES (?,?,'test')").run(id,tableId);
}
test('two-person teams use 2, then 3, then 4 seats and wait when every suitable table is occupied', async () => {
 for (const [occupied, expected] of [[[],903],[[903],902],[[903,902],901],[[903,902,901],null]]) {
  const f=mixedFixture();
  try {
   occupied.forEach((id,i)=>occupy(f,i+2,id));
   const response=await attendance(context(f.DB,payload(2)));
   assert.equal(response.status,200);
   const team=(await response.json()).team;
   assert.equal(team.allocation.table_id,expected);
   if(expected) assert.equal(team.allocation.table_seats,expected===903?2:expected===902?3:4);
   assert.equal(team.allocation.present_count,2);
  } finally {f.sqlite.close();}
 }
});
test('three-person teams prefer 3 then 4 and never use 2 seats', async () => {
 for(const [occupied,expected] of [[[],902],[[902],901],[[902,901],null]]) {
  const f=mixedFixture();
  try {
   occupied.forEach((id,i)=>occupy(f,i+2,id));
   const response=await attendance(context(f.DB,payload(3)));
   assert.equal(response.status,200);
   assert.equal((await response.json()).team.allocation.table_id,expected);
  }finally{f.sqlite.close();}
 }
});
test('four-person teams only use 4-seat tables',async()=>{
 for(const full of [false,true]) {
  const f=mixedFixture();
  try {
   f.sqlite.exec("INSERT INTO hackathon_team_members VALUES(14,1,'Member 4','','','Member',4)");
   if(full)occupy(f,2,901);
   const body={...payload(),attendance:[...payload().attendance,{memberId:14,present:true,mealPreference:'Veg'}]};
   const response=await attendance(context(f.DB,body));
   assert.equal(response.status,200);
   assert.equal((await response.json()).team.allocation.table_id,full?null:901);
  }finally{f.sqlite.close();}
 }
});
test('exact capacity wins across rooms before an earlier larger table',async()=>{
 const f=mixedFixture();
 try {
  f.sqlite.exec('UPDATE venue_tables SET seats=4 WHERE room_id=1; INSERT INTO venue_tables VALUES (904,3,1,2)');
  const response=await attendance(context(f.DB,payload(2)));
  assert.equal((await response.json()).team.allocation.table_id,904);
 }finally{f.sqlite.close();}
});
test('repeat check-in retains a fitting larger table; growing teams move off undersized tables',async()=>{
 const f=mixedFixture();
 try {
  await attendance(context(f.DB,payload(2)));
  await reallocate(context(f.DB,{teamId:1,currentTableId:903,tableId:901},'PATCH'));
  assert.equal((await (await attendance(context(f.DB,payload(2)))).json()).team.allocation.table_id,901);
  assert.equal((await reallocate(context(f.DB,{teamId:1,currentTableId:901,tableId:903},'PATCH'))).status,200);
  assert.equal((await (await attendance(context(f.DB,payload(3)))).json()).team.allocation.table_id,902);
 }finally{f.sqlite.close();}
});
test('manual assignment and reallocation accept larger tables but reject undersized targets',async()=>{
 const f=mixedFixture();
 try {
  await attendance(context(f.DB,payload(3)));
  f.sqlite.exec('DELETE FROM venue_allocations');
  assert.equal((await manual(context(f.DB,{teamId:1,tableId:903}))).status,409);
  assert.equal((await manual(context(f.DB,{teamId:1,tableId:901}))).status,200);
  assert.equal((await reallocate(context(f.DB,{teamId:1,currentTableId:901,tableId:903},'PATCH'))).status,409);
  assert.equal((await reallocate(context(f.DB,{teamId:1,currentTableId:901,tableId:902},'PATCH'))).status,200);
  const data=await (await onRequestGet(context(f.DB,null,'GET','venues'))).json();
  assert.deepEqual(data.tables.map(t=>t.seats),[4,3,2]);
  assert.equal(data.teams[0].table_seats,3);
 }finally{f.sqlite.close();}
});
test('larger tables never bypass sector, solution type or preparation mode',async()=>{
 const f=mixedFixture();
 try {
  f.sqlite.exec("UPDATE venue_tables SET seats=2; INSERT INTO venue_tables VALUES(904,2,1,4),(905,15,1,4),(906,33,1,4)");
  const response=await attendance(context(f.DB,payload(3)));
  assert.equal((await response.json()).team.allocation.table_id,null);
  for(const tableId of [904,905,906])assert.equal((await manual(context(f.DB,{teamId:1,tableId}))).status,409);
 }finally{f.sqlite.close();}
});


test('table-capacity migration preserves inventory and existing assignments', () => {
 const f=fixture('write',false);
 try {
  f.sqlite.exec("INSERT INTO venue_allocations(team_id,table_id,assigned_by) VALUES(1,21,'existing-staff')");
  const before=f.sqlite.prepare('SELECT * FROM venue_allocations').all();
  f.sqlite.exec(readFileSync(new URL('../db/migrations/0024_table_seating.sql',import.meta.url),'utf8'));
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM venue_allocations').all(),before);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM venue_tables').get().n,565);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM venue_tables t JOIN venue_rooms r ON r.id=t.room_id WHERE t.seats<>r.seats').get().n,0);
  for(const seats of [0,1,5,2.5,null])assert.throws(()=>f.sqlite.prepare('UPDATE venue_tables SET seats=? WHERE id=1').run(seats));
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{f.sqlite.close();}
});
