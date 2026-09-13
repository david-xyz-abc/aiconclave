import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture,context } from './venueFixture.js';
import {onRequestPost as save,onRequestPatch as legacyLead,loadTeam} from '../functions/api/attendance/teams/[id].js';
const body=(version,lead=11,present=[11,12])=>({date:'2026-09-16',expectedVersion:version,leadMemberId:lead,projectMode:'Prepared',attendance:[11,12,13].map(memberId=>({memberId,present:present.includes(memberId),mealPreference:'Veg'}))});
const snapshot=f=>JSON.stringify({team:f.sqlite.prepare('SELECT * FROM hackathon_teams').all(),attendance:f.sqlite.prepare('SELECT * FROM hackathon_attendance').all(),allocation:f.sqlite.prepare('SELECT * FROM venue_allocations').all(),mode:f.sqlite.prepare('SELECT * FROM venue_checkins').all()});
test('competing check-in drafts: exactly one commits; stale save cannot change lead, attendance, mode or table',async()=>{
 const f=fixture();try{
  const v=f.DB.currentVersion();
  const responses=await Promise.all([save(context(f.DB,body(v))),save(context(f.DB,{...body(v,13,[12,13]),projectMode:'Starting from scratch'}))]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const before=snapshot(f);
  assert.equal((await save(context(f.DB,body(v,13,[12,13])))).status,409);
  assert.equal(snapshot(f),before);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM checkin_save_guards').get().n,0);
 }finally{f.sqlite.close();}
});
test('lead and attendance commit together; obsolete separate lead request cannot mutate checked-in team',async()=>{
 const f=fixture();try{
  assert.equal((await save(context(f.DB,body(f.DB.currentVersion())))).status,200);
  const before=snapshot(f);
  assert.equal((await legacyLead(context(f.DB,{leadMemberId:13,editingAttendance:true},'PATCH'))).status,409);
  assert.equal(snapshot(f),before);
  assert.equal((await save(context(f.DB,body(f.DB.currentVersion(),13,[12,13])))).status,200);
  const q=f.sqlite.prepare('SELECT * FROM venue_requirements WHERE team_id=1').get();
  assert.equal(q.lead_present,1);assert.equal(q.present_count,2);
  assert.equal(f.sqlite.prepare('SELECT attendance_lead_member_id id FROM hackathon_teams').get().id,13);
 }finally{f.sqlite.close();}
});
test('missing version, absent draft lead, and roster edits cannot overwrite check-in',async()=>{
 const f=fixture();try{
  const v=f.DB.currentVersion();
  const ctx=context(f.DB,body(v)); const requestBody=body(v);delete requestBody.expectedVersion;
  ctx.request=new Request(ctx.request.url,{method:'POST',headers:ctx.request.headers,body:JSON.stringify(requestBody)});
  assert.equal((await save(ctx)).status,409);
  assert.equal((await save(context(f.DB,body(v,13)))).status,400);
  f.sqlite.exec("UPDATE hackathon_team_members SET full_name='Corrected name' WHERE id=12");
  assert.equal((await save(context(f.DB,body(v)))).status,409);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM hackathon_attendance').get().n,0);
 }finally{f.sqlite.close();}
});
test('failed allocation rolls back version and lead together, while summary and edit expose current version',async()=>{
 const f=fixture();try{
  const v=f.DB.currentVersion();
  f.sqlite.exec("CREATE TRIGGER fail BEFORE INSERT ON venue_allocations BEGIN SELECT RAISE(ABORT,'forced');END;");
  assert.equal((await save(context(f.DB,body(v,13,[12,13])))).status,500);
  assert.equal(f.DB.currentVersion(),v);
  assert.equal(f.sqlite.prepare('SELECT attendance_lead_member_id id FROM hackathon_teams').get().id,null);
  f.sqlite.exec('DROP TRIGGER fail');
  const res=await save(context(f.DB,body(v)));assert.equal(res.status,200);
  const data=await res.json();assert.ok(data.team.checkin_version>v);
  for(const full of [true,false])assert.equal((await loadTeam(f.DB,1,'2026-09-16',full)).checkin_version,f.DB.currentVersion());
 }finally{f.sqlite.close();}
});
