import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestPatch } from '../functions/api/registrations/[id].js';

function fixture(beforeBatch = () => {}) {
 const sqlite = new DatabaseSync(':memory:');
 sqlite.exec('PRAGMA foreign_keys=ON');
 sqlite.exec(readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'));
 sqlite.exec(readFileSync(new URL('../db/migrations/0021_judging_admin.sql',import.meta.url),'utf8'));
 sqlite.exec(`INSERT INTO participant_accounts(id,google_sub,email) VALUES(1,'test','captain@example.test');
 INSERT INTO hackathon_teams(id,team_name,team_name_key,captain_account_id,participant_category,team_size,sector_track,solution_type,submitted_at) VALUES(1,'Test team','test team',1,'College',2,'Agriculture','Technical','2026-09-12');
 INSERT INTO hackathon_team_members(id,team_id,member_order,role,full_name,email,email_key,phone,institution,year_or_grade) VALUES(1,1,1,'Captain','Captain One','captain@example.test','captain@example.test','+919876543210','College','1'),(2,1,2,'Member','Member Two','member@example.test','member@example.test','+919876543211','College','1');`);
 const changes=[];
 const DB={prepare(sql){let args=[];const stmt={bind(...values){args=values;return stmt;},async first(){if(sql.includes('FROM admin_sessions'))return {id:1,user_id:1,username:'staff',role:'admin',registrations_access:'write'};return sqlite.prepare(sql).get(...args);},async all(){return {results:sqlite.prepare(sql).all(...args)};},run(){const before=sqlite.prepare('SELECT total_changes() AS n').get().n;const results=sqlite.prepare(sql).all(...args);const count=sqlite.prepare('SELECT total_changes() AS n').get().n-before;changes.push(count);return {results,meta:{changes:count}};}};return stmt;},async batch(statements){beforeBatch(sqlite);sqlite.exec('BEGIN');try{const results=statements.map(s=>s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const body={version:1,changes:{team_name:'Updated team',participant_category:'College',sector_track:'Agriculture',solution_type:'Technical',members:[1,2].map((id)=>({id,version:1,full_name:id===1?'Captain One':'Updated member',phone:id===1?'+919876543210':'+919876543211',institution:'College',department_or_course:'',year_or_grade:'1'}))}};
 const save=()=>onRequestPatch({env:{DB},params:{id:'1'},request:new Request('https://test.example/api/registrations/1?type=hackathon&record_type=team',{method:'PATCH',headers:{origin:'https://test.example','content-type':'application/json',cookie:'__Host-aiconclave_dashboard_session=test'},body:JSON.stringify(body)})});
 return {sqlite,save,changes};
}

test('fresh team edit succeeds even when judging triggers inflate D1 change counts',async()=>{
 const f=fixture();try{
  const response=await f.save();
  assert.equal(response.status,200);
  assert.ok(f.changes[0]>1);
  const data=await response.json();
  assert.equal(data.registration.team_name,'Updated team');
  assert.equal(data.registration.members[1].full_name,'Updated member');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM admin_registration_audit').get().n,1);
  assert.equal((await f.save()).status,409);
 }finally{f.sqlite.close();}
});
for(const race of ["UPDATE hackathon_teams SET edit_version=2,team_name='Other staff' WHERE id=1","UPDATE hackathon_team_members SET edit_version=2,full_name='Other member edit' WHERE id=2","DELETE FROM hackathon_team_members WHERE id=2"]){
 test('concurrent change rejects the whole team edit without partial writes: '+race,async()=>{
  const f=fixture(db=>db.exec(race));try{
   const response=await f.save();assert.equal(response.status,409);
   assert.notEqual(f.sqlite.prepare('SELECT team_name FROM hackathon_teams WHERE id=1').get().team_name,'Updated team');
   assert.equal(f.sqlite.prepare('SELECT edit_version FROM hackathon_team_members WHERE id=1').get().edit_version,1);
   assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM admin_registration_audit').get().n,0);
  }finally{f.sqlite.close();}
 });
}
