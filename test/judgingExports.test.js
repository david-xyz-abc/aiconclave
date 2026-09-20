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
 db.exec(`CREATE TABLE hackathon_teams(id INTEGER,team_name TEXT,team_code TEXT,sector_track TEXT,attendance_lead_member_id INTEGER,participant_category TEXT);
 CREATE TABLE hackathon_team_members(id INTEGER,team_id INTEGER,full_name TEXT,role TEXT,member_order INTEGER,institution TEXT);
 CREATE TABLE judging_evaluations(team_id INTEGER,scores TEXT,nominations TEXT,team_snapshot TEXT,status TEXT);`);
 let id=0;
 const insert=(sector,award,mark,status='submitted',name)=>{
  id++;const scores=Object.fromEntries(CRITERIA.map(c=>[c.id,mark]));
  db.prepare("INSERT INTO hackathon_teams VALUES(?,?,?,?,NULL,'College')").run(id,name||'Team '+id,'CODE-'+id,sector);
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
  const headers=[...xml.matchAll(/<c r="[A-J]1"[^>]*><is><t[^>]*>(.*?)<\/t>/g)].map(m=>m[1]);
  assert.deepEqual(headers,['Team Name','Team Lead','School/College','School/College Name','Impact (out of 10)','Creativity (out of 10)','Validity (out of 10)','Relevance (out of 10)','Presentation (out of 10)','Total (out of 50)']);
  assert.match(xml,/<c r="E2"[^>]*><v>10<\/v>/);assert.match(xml,/<c r="J2"[^>]*><v>50<\/v>/);
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

test('college and school filters apply to overall, sector and award results using the submitted category',async()=>{
 const f=await fixture();try{
  const award=AWARDS.Agriculture[0][0];
  const school=f.insert('Agriculture',award,3,'submitted','School winner');
  f.db.prepare("UPDATE hackathon_teams SET participant_category='School' WHERE id=?").run(school);
  const snapshotSchool=f.insert('Agriculture',award,4,'submitted','School snapshot');
  f.db.prepare("UPDATE judging_evaluations SET team_snapshot=json_set(team_snapshot,'$.participant_category','School') WHERE team_id=?").run(snapshotSchool);
  const schoolDraft=f.insert('Agriculture',award,5,'draft','School draft');
  f.db.prepare("UPDATE hackathon_teams SET participant_category='School' WHERE id=?").run(schoolDraft);
  for(const kind of ['overall','sector','award']){
   const query={kind,sector:'Agriculture',award};
   const schoolResponse=await f.request(new URLSearchParams({...query,category:'School'}));
   assert.equal(schoolResponse.status,200);
   const schoolRows=(await schoolResponse.json()).rows;
   assert.deepEqual(schoolRows.map(r=>r.team_id),[snapshotSchool,school]);
   assert.ok(schoolRows.every(r=>r.participant_category==='School'));
   const collegeRows=(await (await f.request(new URLSearchParams({...query,category:'College'}))).json()).rows;
   assert.ok(collegeRows.length>0);
   assert.ok(collegeRows.every(r=>r.participant_category==='College'));
   assert.ok(collegeRows.every(r=>r.team_id!==school && r.team_id!==snapshotSchool));
   const combined=(await (await f.request(new URLSearchParams(query))).json()).rows;
   assert.equal(combined.length,collegeRows.length+schoolRows.length);
  }
  assert.equal((await f.request('kind=overall&category=Unknown')).status,400);
  assert.equal((await f.request('kind=overall&category=')).status,400);
  assert.equal((await f.request('kind=overall&category=School','')).status,401);
 }finally{f.db.close();}
});

test('category downloads contain only the selected entries with distinct workbook names',async()=>{
 const f=await fixture();try{
  const id=f.insert('Agriculture',NO_AWARD,4,'submitted','Only school entry');
  f.db.prepare("UPDATE hackathon_teams SET participant_category='School' WHERE id=?").run(id);
  const {rows}=await (await f.request('kind=overall')).json();
  for(const category of ['College','School']){
   const {bytes,filename}=await createJudgingResultsWorkbook(rows,{kind:'overall',category});
   assert.match(filename,new RegExp('-'+category.toLowerCase()+'-overall-score-breakdown-'));
   const zip=unzipSync(bytes),xml=strFromU8(zip['xl/worksheets/sheet1.xml']);
   assert.match(strFromU8(zip['xl/workbook.xml']),new RegExp(category+' Results'));
   assert.equal(xml.includes('Only school entry'),category==='School');
   assert.equal([...xml.matchAll(/<row\b/g)].length,1+rows.filter(r=>r.participant_category===category).length);
  }
  await assert.rejects(createJudgingResultsWorkbook(rows.filter(r=>r.participant_category==='College'),{kind:'overall',category:'School'}),/No submitted evaluations/);
 }finally{f.db.close();}
});

test('all result workbooks include category and the displayed team lead institution',async()=>{
 const f=await fixture();try{
  const award=AWARDS.Agriculture[0][0];
  const id=f.insert('Agriculture',award,5,'submitted','Institution check');
  f.db.prepare('INSERT INTO hackathon_team_members VALUES(?,?,?,?,?,?)').run(1001,id,'Captain','Captain',1,'Captain College');
  f.db.prepare('INSERT INTO hackathon_team_members VALUES(?,?,?,?,?,?)').run(1002,id,'Attendance Lead','Member',2,'Lead School');
  f.db.prepare("UPDATE hackathon_teams SET attendance_lead_member_id=1002,participant_category='School' WHERE id=?").run(id);
  f.db.prepare("UPDATE judging_evaluations SET team_snapshot=json_set(team_snapshot,'$.leader_name','Attendance Lead') WHERE team_id=?").run(id);
  for(const kind of ['overall','sector','award']){
   const {rows}=await (await f.request(new URLSearchParams({kind,sector:'Agriculture',award,category:'School'}))).json();
   assert.equal(rows.length,1);
   assert.equal(rows[0].leader_institution,'Lead School');
   const {bytes}=await createJudgingResultsWorkbook(rows,{kind,sector:'Agriculture',awardName:'Test Award',category:'School'});
   const xml=strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml']);
   assert.match(xml,/<c r="C1"[^>]*><is><t[^>]*>School\/College<\/t>/);
   assert.match(xml,/<c r="D1"[^>]*><is><t[^>]*>School\/College Name<\/t>/);
   assert.match(xml,/<c r="C2"[^>]*><is><t[^>]*>School<\/t>/);
   assert.match(xml,/<c r="D2"[^>]*><is><t[^>]*>Lead School<\/t>/);
   assert.doesNotMatch(xml,/Captain College/);
  }
  // A later attendance-lead change must not pair the saved leader with another institution.
  f.db.prepare('UPDATE hackathon_teams SET attendance_lead_member_id=1001 WHERE id=?').run(id);
  let row=(await (await f.request('kind=overall&category=School')).json()).rows[0];
  assert.equal(row.leader_institution,'Lead School');
  // Historical evaluations without a leader snapshot use the current attendance lead, then captain.
  f.db.prepare("UPDATE judging_evaluations SET team_snapshot=json_remove(team_snapshot,'$.leader_name') WHERE team_id=?").run(id);
  row=(await (await f.request('kind=overall&category=School')).json()).rows[0];
  assert.equal(row.leader_name,'Captain');assert.equal(row.leader_institution,'Captain College');
  f.db.prepare('UPDATE hackathon_teams SET attendance_lead_member_id=NULL WHERE id=?').run(id);
  row=(await (await f.request('kind=overall&category=School')).json()).rows[0];
  assert.equal(row.leader_institution,'Captain College');
 }finally{f.db.close();}
});

test('award workbooks include five distinct numeric scores before the total for both categories',async()=>{
 for(const category of ['College','School']){
  const rows=[{team_name:'Award team',leader_name:'Leader',participant_category:category,leader_institution:'Institute',team_code:'CODE',sector:'Agriculture',scores:{impact:6,creativity:7,validity:8,relevance:9,presentation:10},total:40}];
  const {bytes}=await createJudgingResultsWorkbook(rows,{kind:'award',sector:'Agriculture',awardName:'Selected award',category});
  const xml=strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml']);
  const headers=[...xml.matchAll(/<c r="[A-Z]+1"[^>]*><is><t[^>]*>(.*?)<\/t>/g)].map(m=>m[1]);
  assert.deepEqual(headers,['Team Name','Team Lead','School/College','School/College Name','Team Code','Sector','Award','Impact (out of 10)','Creativity (out of 10)','Validity (out of 10)','Relevance (out of 10)','Presentation (out of 10)','Total (out of 50)']);
  for(const [col,value] of [['H',6],['I',7],['J',8],['K',9],['L',10],['M',40]])assert.match(xml,new RegExp('<c r="'+col+'2"[^>]*><v>'+value+'</v>'));
 }
});
