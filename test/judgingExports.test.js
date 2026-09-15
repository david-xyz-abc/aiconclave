import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {unzipSync,strFromU8} from 'fflate';
import {onRequestGet} from '../functions/api/excel/judging.js';
import {token,COOKIE} from '../functions/_shared/excelSession.js';
import {AWARDS,CRITERIA,NO_AWARD} from '../judging/shared/evaluation.js';
import {createJudgingResultsWorkbook} from '../src/services/registrationExport.js';

async function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE hackathon_teams(id INTEGER,team_name TEXT,team_code TEXT,sector_track TEXT,attendance_lead_member_id INTEGER);
 CREATE TABLE hackathon_team_members(id INTEGER,team_id INTEGER,full_name TEXT,role TEXT,member_order INTEGER);
 CREATE TABLE judging_evaluations(team_id INTEGER,scores TEXT,nominations TEXT,team_snapshot TEXT,status TEXT);`);
 let id=0;
 const insert=(sector,award,mark,status='submitted',name)=>{
  id++;const scores=Object.fromEntries(CRITERIA.map(c=>[c.id,mark]));
  db.prepare('INSERT INTO hackathon_teams VALUES(?,?,?,?,NULL)').run(id,name||'Team '+id,'CODE-'+id,sector);
  db.prepare('INSERT INTO judging_evaluations VALUES(?,?,?,?,?)').run(id,JSON.stringify(scores),JSON.stringify([award]),JSON.stringify({leader_name:'Leader '+id,sector_track:sector}),status);
  return id;
 };
 for(const [sector,awards] of Object.entries(AWARDS)){
  for(const [award] of awards){insert(sector,award,2);insert(sector,award,4);}
  insert(sector,NO_AWARD,5);insert(sector,awards[0][0],5,'draft');
 }
 const env={EXCEL_SESSION_SECRET:'export-test-secret',DB:{prepare(sql){let args=[];return {bind(...a){args=a;return this;},all(){return {results:db.prepare(sql).all(...args)};}};}}};
 const auth=`${COOKIE}=${await token(env.EXCEL_SESSION_SECRET)}`;
 const request=(query,cookie=auth)=>onRequestGet({env,request:new Request('https://test.example/api/excel/judging?'+query,{headers:{cookie}})});
 return {db,insert,request};
}
test('all 18 awards and 3 sector lists contain only final matching teams, descending by total',async()=>{
 const f=await fixture();try{
  for(const [sector,awards] of Object.entries(AWARDS)){
   for(const [award] of awards){const r=await f.request(new URLSearchParams({kind:'award',sector,award}));assert.equal(r.status,200);const {rows}=await r.json();assert.deepEqual(rows.map(r=>r.total),[40,20]);}
   const {rows}=await (await f.request(new URLSearchParams({kind:'sector',sector}))).json();assert.equal(rows.length,13);assert.equal(rows[0].total,50);
  }
  const {rows}=await (await f.request('kind=overall')).json();assert.equal(rows.length,39);assert.ok(rows.every((r,i)=>!i||rows[i-1].total>=r.total));
  f.db.prepare("UPDATE judging_evaluations SET status='draft' WHERE team_id=?").run(rows[0].team_id);
  assert.equal((await (await f.request('kind=overall')).json()).rows.length,38);
  assert.equal((await f.request('kind=overall','')).status,401);
  assert.equal((await f.request('kind=award&sector=Agriculture&award=health-impact')).status,400);
  assert.equal((await f.request('kind=sector&sector=Unknown')).status,400);
 }finally{f.db.close();}
});
test('overall workbook has exact requested columns, numeric marks, descending totals and plain headers',async()=>{
 const f=await fixture();try{
  const {rows}=await (await f.request('kind=overall')).json();
  const {bytes}=await createJudgingResultsWorkbook(rows,{kind:'overall'});
  const zip=unzipSync(bytes),xml=strFromU8(zip['xl/worksheets/sheet1.xml']);
  const headers=[...xml.matchAll(/<c r="[A-H]1"[^>]*><is><t[^>]*>(.*?)<\/t>/g)].map(m=>m[1]);
  assert.deepEqual(headers,['Team Name','Team Lead','Impact (out of 10)','Creativity (out of 10)','Validity (out of 10)','Relevance (out of 10)','Presentation (out of 10)','Total (out of 50)']);
  assert.match(xml,/<c r="C2"[^>]*><v>10<\/v>/);assert.match(xml,/<c r="H2"[^>]*><v>50<\/v>/);
  assert.doesNotMatch(xml,/<mergeCells/);
  await assert.rejects(createJudgingResultsWorkbook([],{kind:'overall'}),/No submitted evaluations/);
 }finally{f.db.close();}
});


test('mixed historical five-point and new ten-point results use the same export scale without rewriting records',async()=>{
 const f=await fixture();try{
  const newId=f.insert('Agriculture',NO_AWARD,8);
  f.db.prepare("UPDATE judging_evaluations SET team_snapshot=json_set(team_snapshot,'$.score_max',10) WHERE team_id=?").run(newId);
  const before=f.db.prepare('SELECT * FROM judging_evaluations ORDER BY team_id').all();
  const r=await f.request('kind=overall');assert.equal(r.status,200);
  const {rows}=await r.json();
  assert.equal(rows.find(r=>r.team_id===newId).total,40);
  assert.equal(rows[0].total,50);
  assert.deepEqual(f.db.prepare('SELECT * FROM judging_evaluations ORDER BY team_id').all(),before);
 }finally{f.db.close();}
});
