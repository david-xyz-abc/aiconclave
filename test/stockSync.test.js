import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,context} from './venueFixture.js';
import {deliverOne,dispatchPending} from '../functions/_shared/stockSync.js';
import {onRequestPost} from '../functions/api/attendance/teams/[id].js';
import {onRequestGet} from '../functions/api/attendance/stock-sync.js';
const migration=readFileSync(new URL('../db/migrations/0039_stock_checkin_delivery.sql',import.meta.url),'utf8');
const activation=readFileSync(new URL('../scripts/activate-stock-sync.sql',import.meta.url),'utf8');
function setup() {
 const f=fixture();f.sqlite.exec("ALTER TABLE hackathon_team_members ADD COLUMN phone TEXT DEFAULT '+91 73568 58752'; UPDATE hackathon_team_members SET email='member'||id||'@example.test';");f.sqlite.exec(migration);return f;
}
function mark(f,id,present=1,date='2026-09-16') {f.sqlite.prepare(`INSERT INTO hackathon_attendance(team_id,member_id,attendance_date,present) VALUES(1,?,?,?) ON CONFLICT(team_id,member_id,attendance_date) DO UPDATE SET present=excluded.present`).run(id,date,present);}
const rows=f=>f.sqlite.prepare('SELECT * FROM stock_checkin_deliveries ORDER BY id').all();
const success=async()=>Response.json({status:true,data:{participant_id:'1747'}});
test('activation excludes previous check-ins permanently, only present newcomers enqueue',()=>{
 const f=setup();mark(f,11);assert.equal(rows(f).length,0);f.sqlite.exec(activation);mark(f,11,0);mark(f,11);mark(f,12);mark(f,13,0);
 assert.deepEqual(rows(f).map(r=>[r.member_id,r.status]),[[11,'excluded'],[12,'pending']]);
 f.sqlite.exec(activation);assert.equal(rows(f)[1].status,'pending');
});
test('parallel delivery, editing, removal and re-add across dates never resend',async()=>{
 const f=setup();f.sqlite.exec(activation);mark(f,11);mark(f,12);let calls=[];
 const mock=async(url,options)=>{calls.push({url,...JSON.parse(options.body)});return success();};
 await Promise.all([dispatchPending(f.DB,1,mock),dispatchPending(f.DB,null,mock)]);
 mark(f,11,0);mark(f,11);mark(f,12,1,'2026-09-17');await dispatchPending(f.DB,1,mock);
 assert.equal(calls.length,2);assert.equal(calls[0].phone,'7356858752');assert.equal(calls[0].event_id,'3');assert.equal(calls[0].action,'addEventParticipant');
 mark(f,13);await dispatchPending(f.DB,1,mock);assert.equal(calls.length,3);assert.ok(rows(f).every(r=>r.status==='sent'));
});
test('email case/whitespace and changed email on same member cannot bypass protection',()=>{
 const f=setup();f.sqlite.exec(activation);mark(f,11);f.sqlite.exec("UPDATE hackathon_team_members SET email=' MEMBER11@EXAMPLE.TEST ' WHERE id=12");mark(f,12);
 f.sqlite.exec("UPDATE hackathon_team_members SET email='different@example.test' WHERE id=11");mark(f,11);assert.equal(rows(f).length,1);
});
test('failed or ambiguous responses are never retried',async()=>{
 for(const response of [async()=>{throw new Error('timeout');},async()=>Response.json({status:false}),async()=>new Response('bad'),async()=>Response.json({status:true},{status:500})]) {
  const f=setup();f.sqlite.exec(activation);mark(f,11);let calls=0;
  const mock=async()=>{calls++;return response();};await dispatchPending(f.DB,1,mock);mark(f,11);await dispatchPending(f.DB,1,mock);
  assert.equal(calls,1);assert.ok(['failed','uncertain'].includes(rows(f)[0].status));
 }
});
test('claim survives process loss without retry; unclaimed work remains deliverable',async()=>{
 const f=setup();f.sqlite.exec(activation);mark(f,11);mark(f,12);
 f.sqlite.exec("UPDATE stock_checkin_deliveries SET status='sending',attempted_at=datetime('now','-3 minutes') WHERE member_id=11");let calls=0;
 await dispatchPending(f.DB,null,async()=>{calls++;return success();});assert.equal(calls,1);assert.equal(rows(f)[0].status,'uncertain');
});
test('transaction rollback removes pending delivery as well as attendance',()=>{
 const f=setup();f.sqlite.exec(activation);f.sqlite.exec('BEGIN');mark(f,11);f.sqlite.exec('ROLLBACK');assert.equal(rows(f).length,0);
});
test('real check-in path queues every present member and stale saves do not enqueue',async()=>{
 const f=setup();f.sqlite.exec(activation);
 let response=await onRequestPost(context(f.DB,{date:'2026-09-16',projectMode:'Prepared',attendance:[{memberId:11,present:true},{memberId:12,present:true},{memberId:13,present:false}]}));
 assert.equal(response.status,200);assert.deepEqual(rows(f).map(r=>r.member_id),[11,12]);
 response=await onRequestPost(context(f.DB,{expectedVersion:0,date:'2026-09-16',attendance:[{memberId:11,present:true},{memberId:12,present:true},{memberId:13,present:true}]}));
 assert.equal(response.status,409);assert.equal(rows(f).length,2);
});
test('status endpoint requires attendance authentication',async()=>{
 const f=setup();const ctx=context(f.DB,null,'GET','stock-sync?teamId=1');ctx.request=new Request(ctx.request.url);
 assert.equal((await onRequestGet(ctx)).status,401);
});
test('production hook schedules delivery after committed attendance and remote failure leaves check-in successful',async()=>{
 const f=setup();f.sqlite.exec(activation);const original=globalThis.fetch;let calls=0;const work=[];
 globalThis.fetch=async()=>{calls++;throw new Error('offline');};
 try {
  const ctx=context(f.DB,{date:'2026-09-16',projectMode:'Prepared',attendance:[{memberId:11,present:true},{memberId:12,present:true},{memberId:13,present:false}]});
  ctx.env.STOCK_SYNC_ENABLED='1';ctx.waitUntil=promise=>work.push(promise);
  const response=await onRequestPost(ctx);assert.equal(response.status,200);await Promise.all(work);
  assert.equal(calls,2);assert.ok(rows(f).every(row=>row.status==='uncertain'));
 } finally {globalThis.fetch=original;}
});
