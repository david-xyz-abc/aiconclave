import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture} from './venueFixture.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const setup=()=>{const f=fixture();f.sqlite.exec(read('db/migrations/0021_judging_admin.sql'));f.sqlite.exec(read('db/migrations/0022_judging_auth.sql'));f.sqlite.exec(read('db/migrations/0023_judge_evaluations.sql'));f.sqlite.exec('BEGIN');f.sqlite.exec(read('db/migrations/0025_real_venue_plan.sql'));f.sqlite.exec('COMMIT');f.sqlite.exec('DROP VIEW venue_requirements; DROP TRIGGER checkin_preparation_changed; ALTER TABLE hackathon_teams DROP COLUMN preparation_mode;');f.sqlite.exec('CREATE VIEW'+read('db/migrations/0019_venue_allocation.sql').split('CREATE VIEW')[1]);return f;};
test('production promotion preserves registrations and installs the final capacity plan',()=>{const f=setup();try{
 const before=f.sqlite.prepare('SELECT * FROM hackathon_team_members').all();
 f.sqlite.exec('BEGIN');f.sqlite.exec(read('db/production/0035_promote_preparation_and_rooms.sql'));f.sqlite.exec('COMMIT');
 assert.deepEqual(f.sqlite.prepare('SELECT * FROM hackathon_team_members').all(),before);
 assert.equal(f.sqlite.prepare('SELECT preparation_mode FROM hackathon_teams').get().preparation_mode,'Starting from scratch');
 const plan=JSON.parse(read('db/real-venues.json'));const rows=f.sqlite.prepare('SELECT r.name,r.project_mode,r.solution_type,t.table_number,t.seats FROM venue_tables t JOIN venue_rooms r ON r.id=t.room_id ORDER BY t.table_number').all().map(r=>({...r}));
 assert.deepEqual(rows,plan.flatMap(v=>Array.from({length:v.end-v.start+1},(_,i)=>({name:v.name,project_mode:v.projectMode,solution_type:v.category,table_number:v.start+i,seats:v.seats}))));
 assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
}finally{f.sqlite.close();}});
test('production promotion refuses to replace an active event inventory',()=>{const f=setup();try{
 f.sqlite.exec("INSERT INTO hackathon_attendance(team_id,member_id,attendance_date,present) VALUES(1,11,'2026-09-16',1)");
 f.sqlite.exec('BEGIN');assert.throws(()=>f.sqlite.exec(read('db/production/0035_promote_preparation_and_rooms.sql')));f.sqlite.exec('ROLLBACK');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM hackathon_attendance').get().n,1);
}finally{f.sqlite.close();}});
