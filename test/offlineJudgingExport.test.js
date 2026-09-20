import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {unzipSync,strFromU8} from 'fflate';
import {createOfflineJudgingWorkbook} from '../src/services/offlineJudgingExport.js';
import {onRequestGet} from '../functions/api/excel/offline.js';
import {token,COOKIE} from '../functions/_shared/excelSession.js';

const template = readFileSync(new URL('../public/templates/offline-judging.xlsx',import.meta.url));
const team = id => ({team_id:id,visit_order:id,team_code:`AIC26-H-${String(id).padStart(8,'0')}`,room_name:'Room 301',table_number:100+id,participant_category:'College',sector_track:'Agriculture'});
const data = teams => ({judge:{id:'judge-1',name:'Dr. Example & Co'},teams,generatedAt:'2026-09-16T03:30:00.000Z'});
const content = (zip,path) => strFromU8(zip[path]);

test('offline workbook preserves both paper formats and leaves every marking cell empty',async()=>{
  const {bytes,filename} = await createOfflineJudgingWorkbook(data([team(2),team(1)]),template);
  const zip=unzipSync(bytes),evalXml=content(zip,'xl/worksheets/sheet1.xml'),awardXml=content(zip,'xl/worksheets/sheet2.xml');
  assert.match(filename,/dr-example-co/);
  assert.match(content(zip,'xl/workbook.xml'),/name="Evaluation"/);
  assert.match(content(zip,'xl/workbook.xml'),/name="Award Nominations"/);
  assert.match(evalXml,/Dr\. Example &amp; Co/);
  assert.match(evalXml,/Table 101/);
  assert.ok(evalXml.indexOf('Table 101')<evalXml.indexOf('Table 102'));
  assert.match(evalXml,/College/);assert.match(evalXml,/Agriculture/);
  assert.match(evalXml,/out of 10/);assert.match(evalXml,/\/50/);
  assert.match(awardXml,/AIC26-H-00000001/);
  for(const [xml,first,last,start,end] of [[evalXml,7,19,4,9],[awardXml,14,26,2,19]]){
    for(let row=first;row<=last;row++)for(let col=start;col<=end;col++){
      assert.match(xml,new RegExp(`<x:c r="${String.fromCharCode(65+col)}${row}" s="\\d+"/>`));
    }
    assert.doesNotMatch(xml,/<x:f\b|\{\{JUDGE\}\}|\{\{EXPORTED\}\}/);
    assert.match(xml,/orientation="landscape"/);
    assert.match(xml,/fitToHeight="0"/);
  }
  assert.match(awardXml,/tick all awards/);
  for(const letter of ['A','H','E'])for(let n=1;n<=6;n++)assert.match(awardXml,new RegExp(`${letter}${n}`));
});

test('offline export includes all teams across page boundaries and repeats print titles',async()=>{
  for(const count of [1,13,14,26,27,100]){
    const {bytes}=await createOfflineJudgingWorkbook(data(Array.from({length:count},(_,i)=>team(i+1))),template);
    const zip=unzipSync(bytes),workbook=content(zip,'xl/workbook.xml');
    const pages=Math.ceil(count/13);
    const evalXml=content(zip,'xl/worksheets/sheet1.xml'),awardXml=content(zip,'xl/worksheets/sheet2.xml');
    assert.equal((evalXml.match(/<x:row /g)||[]).length,6+pages*13);
    assert.equal((awardXml.match(/<x:row /g)||[]).length,13+pages*13);
    assert.equal((awardXml.match(/AIC26-H-/g)||[]).length,count);
    assert.equal((evalXml.match(/<x:brk /g)||[]).length,pages-1);
    assert.match(workbook,/'Evaluation'!\$1:\$6/);
    assert.match(workbook,/'Award Nominations'!\$1:\$13/);
    assert.ok(workbook.includes(`'Evaluation'!$A$1:$J$${6+pages*13}`));
  }
});

test('offline workbook handles literal special characters and rejects invalid assignments',async()=>{
  const {bytes}=await createOfflineJudgingWorkbook(data([{...team(1),room_name:'=1+1 <Room> & Hall'}]),template);
  const xml=content(unzipSync(bytes),'xl/worksheets/sheet1.xml');
  assert.match(xml,/=1\+1 &lt;Room&gt; &amp; Hall/);assert.doesNotMatch(xml,/<x:f\b/);
  await assert.rejects(createOfflineJudgingWorkbook(data([]),template),/no assigned teams/);
  await assert.rejects(createOfflineJudgingWorkbook(data([team(1),team(1)]),template),/repeated team/);
  await assert.rejects(createOfflineJudgingWorkbook(data([{...team(1),room_name:null}]),template),/missing its location/);
});

async function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE judging_judges(id TEXT,name TEXT);
    CREATE TABLE judging_assignments(team_id INTEGER,judge_id TEXT,table_id INTEGER,visit_order INTEGER);
    CREATE TABLE hackathon_teams(id INTEGER,team_code TEXT,team_name TEXT,participant_category TEXT,sector_track TEXT);
    CREATE TABLE venue_allocations(team_id INTEGER,table_id INTEGER);
    CREATE TABLE venue_tables(id INTEGER,table_number INTEGER,room_id INTEGER,seats INTEGER);
    CREATE TABLE venue_rooms(id INTEGER,name TEXT);
    CREATE TABLE venue_requirements(team_id INTEGER,attendance_marked INTEGER,lead_present INTEGER,present_count INTEGER);
    INSERT INTO judging_judges VALUES('j1','Alpha'),('j2','Beta'),('j3','Empty');
    INSERT INTO judging_assignments VALUES(1,'j1',1,2),(2,'j1',2,1),(3,'j2',3,1);
    INSERT INTO hackathon_teams VALUES(1,'CODE1','Team 1','College','Agriculture'),(2,'CODE2','Team 2','School','Healthcare'),(3,'CODE3','Team 3','College','Education');
    INSERT INTO venue_allocations VALUES(1,1),(2,2),(3,3);
    INSERT INTO venue_tables VALUES(1,101,1,4),(2,102,1,4),(3,103,1,4);
    INSERT INTO venue_rooms VALUES(1,'Room 301');
    INSERT INTO venue_requirements VALUES(1,1,1,3),(2,1,1,2),(3,1,1,4);`);
  const DB={prepare(sql){let args=[];return{bind(...values){args=values;return this;},all(){return {results:sqlite.prepare(sql).all(...args)};}};},batch(statements){return statements.map(statement=>statement.all());}};
  const env={DB,EXCEL_SESSION_SECRET:'offline-export-test'};
  const cookie=`${COOKIE}=${await token(env.EXCEL_SESSION_SECRET)}`;
  const request=(query='',auth=cookie)=>onRequestGet({env,request:new Request(`https://test.example/api/excel/offline${query}`,{headers:{cookie:auth}})});
  return {sqlite,request};
}

test('offline API requires Excel login and returns only the selected judge’s current assignments',async()=>{
  const f=await fixture();try{
    assert.equal((await f.request('','')).status,401);
    const list=await (await f.request()).json();
    assert.deepEqual(list.judges.map(j=>[j.name,j.team_count]),[['Alpha',2],['Beta',1],['Empty',0]]);
    const response=await f.request('?judge=j1'),body=await response.json();
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(body.teams.map(t=>t.team_id),[2,1]);
    assert.equal(body.judge.name,'Alpha');
    assert.equal(body.teams[0].room_name,'Room 301');
    assert.equal(body.teams[0].table_number,102);
    assert.equal((await f.request('?judge=missing')).status,404);
    assert.equal((await f.request('?judge=j3')).status,409);
    assert.equal((await f.request('?judge=')).status,400);
    f.sqlite.exec("UPDATE judging_assignments SET judge_id='j2' WHERE team_id=2");
    assert.deepEqual((await (await f.request('?judge=j1')).json()).teams.map(t=>t.team_id),[1]);
    f.sqlite.exec('UPDATE venue_allocations SET table_id=2 WHERE team_id=1');
    assert.equal((await f.request('?judge=j1')).status,409);
    f.sqlite.exec('UPDATE venue_allocations SET table_id=1 WHERE team_id=1; UPDATE venue_requirements SET lead_present=0 WHERE team_id=1');
    assert.equal((await f.request('?judge=j1')).status,409);
  }finally{f.sqlite.close();}
});
