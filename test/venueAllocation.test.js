import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture, context } from './venueFixture.js';
import { onRequestPost as attendance } from '../functions/api/attendance/teams/[id].js';
import { onRequestPost as manual, onRequestGet, MANUAL_SQL } from '../functions/api/attendance/venues.js';
import { CLAIM_SQL } from '../functions/_shared/allocation.js';

const payload = (count = 3, projectMode = 'Prepared') => ({ date: '2026-09-16', projectMode, attendance: [11,12,13].map((memberId,i) => ({ memberId, present: i < count, mealPreference: 'Veg' })) });

test('plan has 53 rooms, 565 tables, seven large rooms, and uniform seating', () => {
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
  f.sqlite.prepare('INSERT INTO venue_tables VALUES (999,?,1)').run(room.id);
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
   CREATE TABLE venue_tables (id INTEGER,room_id INTEGER,table_number INTEGER);
   INSERT INTO venue_tables VALUES (1,1,1),(2,1,2);
   CREATE TABLE venue_allocations (team_id INTEGER PRIMARY KEY, table_id INTEGER UNIQUE, assigned_by TEXT);`);
  const race=sql=>Promise.all([1,2,3].map(id=>new Promise((resolve,reject)=>{
   const worker=new Worker(`const {workerData,parentPort}=require('node:worker_threads'); const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(workerData.path); db.exec('PRAGMA busy_timeout=5000'); const r=db.prepare(workerData.sql).run(...workerData.args); db.close(); parentPort.postMessage(Number(r.changes));`,{eval:true,workerData:{path,sql,args:sql===CLAIM_SQL?['staff',id]:['staff',id,1]}});
   worker.on('message',resolve);worker.on('error',reject);worker.on('exit',code=>{if(code)reject(new Error(`Worker exit ${code}`));});
  })));
  assert.equal((await race(CLAIM_SQL)).reduce((a,b)=>a+b),2);
  assert.equal(db.prepare('SELECT COUNT(DISTINCT table_id) AS n FROM venue_allocations').get().n,2);
  db.exec('DELETE FROM venue_allocations');
  assert.equal((await race(MANUAL_SQL)).reduce((a,b)=>a+b),1);
 } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});
