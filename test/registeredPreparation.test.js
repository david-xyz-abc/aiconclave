import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,context} from './venueFixture.js';
import {onRequestPost,loadTeam} from '../functions/api/attendance/teams/[id].js';
test('stored preparation is visible before check-in and overrides a forged client choice',async()=>{
 const f=fixture();try{
  assert.equal((await loadTeam(f.DB,1,'2026-09-16')).allocation.project_mode,'Starting from scratch');
  for(const mode of ['Starting from scratch','Prepared']){
   f.DB.setPreparation(mode);
   const response=await onRequestPost(context(f.DB,{date:'2026-09-16',expectedVersion:f.DB.currentVersion(),projectMode:mode==='Prepared'?'Starting from scratch':'Prepared',attendance:[11,12,13].map(memberId=>({memberId,present:true}))}));
   assert.equal(response.status,200);assert.equal((await response.json()).team.allocation.project_mode,mode);
   assert.equal(f.sqlite.prepare('SELECT project_mode FROM venue_checkins WHERE team_id=1').get().project_mode,mode);
   const room=f.sqlite.prepare('SELECT r.project_mode FROM venue_allocations a JOIN venue_tables t ON t.id=a.table_id JOIN venue_rooms r ON r.id=t.room_id').get();assert.equal(room.project_mode,mode);
  }
 }finally{f.sqlite.close();}
});
test('check-in needs no preparation input and a preparation change invalidates an old form',async()=>{
 const f=fixture();try{
  const payload={date:'2026-09-16',expectedVersion:f.DB.currentVersion(),attendance:[11,12,13].map(memberId=>({memberId,present:true}))};
  f.DB.setPreparation('Prepared');assert.equal((await onRequestPost(context(f.DB,payload))).status,409);
  payload.expectedVersion=f.DB.currentVersion();assert.equal((await onRequestPost(context(f.DB,payload))).status,200);
 }finally{f.sqlite.close();}
});
