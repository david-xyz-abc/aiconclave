import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './venueFixture.js';
import { CHECKED_IN_SQL, JUDGES_SQL, onRequestGet } from '../functions/api/admin/reports.js';

test('checked-in report uses latest member status and does not duplicate check-in dates', () => {
 const f = fixture();
 try {
  f.sqlite.exec(`INSERT INTO hackathon_attendance(team_id,member_id,attendance_date,present,marked_by)
   VALUES (1,11,'2026-09-15',1,'test'),(1,11,'2026-09-16',0,'test'),
    (1,12,'2026-09-15',1,'test'),(1,12,'2026-09-16',1,'test');`);
  let rows = f.sqlite.prepare(CHECKED_IN_SQL).all();
  assert.equal(rows.length, 1); assert.equal(rows[0].id, 12);
  assert.equal(rows[0].room_name, null);
  const table = f.sqlite.prepare('SELECT id FROM venue_tables LIMIT 1').get();
  f.sqlite.prepare("INSERT INTO venue_allocations(team_id,table_id,assigned_by) VALUES(1,?,'test')").run(table.id);
  rows = f.sqlite.prepare(CHECKED_IN_SQL).all();
  assert.ok(rows[0].room_name); assert.ok(rows[0].table_number);
 } finally { f.sqlite.close(); }
});
test('judge report includes unallocated judges and allocated team visit order', () => {
 const f = fixture();
 try {
  f.sqlite.exec(`CREATE TABLE judging_judges(id TEXT PRIMARY KEY,name TEXT,solution_type TEXT);
   CREATE TABLE judging_assignments(team_id INTEGER,judge_id TEXT,table_id INTEGER,visit_order INTEGER);
   INSERT INTO judging_judges VALUES('a','Judge 1','Technical'),('b','Judge 2','Non-Technical');`);
  const table = f.sqlite.prepare('SELECT id FROM venue_tables LIMIT 1').get();
  f.sqlite.prepare("INSERT INTO judging_assignments VALUES(1,'a',?,1)").run(table.id);
  const rows = f.sqlite.prepare(JUDGES_SQL).all();
  assert.equal(rows.length, 2); assert.equal(rows[0].team_name, 'Git-R-Done');
  assert.equal(rows[0].visit_order, 1); assert.ok(rows[0].room_name);
  assert.equal(rows[1].team_id, null);
 } finally { f.sqlite.close(); }
});
test('admin reports require login before running any report query', async () => {
 const response = await onRequestGet({request:new Request('https://example.com/api/admin/reports?view=checked-in'),env:{DB:{prepare(){throw new Error('Unexpected read');}}}});
 assert.equal(response.status,401);
});
