import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { COUNTS_SQL, onRequest } from '../functions/api/counts.js';

test('counts each current present participant once; ignores absence, drafts and old meals', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE hackathon_teams(id INTEGER, submitted_at TEXT);
    CREATE TABLE hackathon_team_members(id INTEGER, team_id INTEGER);
    CREATE TABLE hackathon_attendance(id INTEGER PRIMARY KEY, member_id INTEGER, team_id INTEGER, attendance_date TEXT, marked_at TEXT, present INTEGER, meal_preference TEXT);
    INSERT INTO hackathon_teams VALUES(1, 'submitted'), (2, NULL);
    INSERT INTO hackathon_team_members VALUES(1,1),(2,1),(3,1),(4,1),(5,2),(6,1);
    INSERT INTO hackathon_attendance VALUES
    (1,1,1,'2026-09-09','10:00',1,'Veg'),
    (2,1,1,'2026-09-10','10:00',1,'Non-Veg'),
    (3,2,1,'2026-09-09','10:00',1,'Veg'),
    (4,2,1,'2026-09-10','10:00',0,NULL),
    (5,3,1,'2026-09-10','10:00',1,NULL),
    (6,4,1,'2026-09-10','10:00',1,'Veg'),
    (7,5,2,'2026-09-10','10:00',1,'Veg'),
    (8,6,1,'2026-09-10','09:00',1,'Non-Veg'),
    (9,6,1,'2026-09-10','10:00',1,'Veg');`);
  assert.deepEqual({ ...db.prepare(COUNTS_SQL).get() }, { present:4, veg:2, nonVeg:1, unrecorded:1 });
  db.exec('DELETE FROM hackathon_attendance');
  assert.deepEqual({ ...db.prepare(COUNTS_SQL).get() }, { present:0, veg:0, nonVeg:0, unrecorded:0 });
  db.close();
});

test('all mutation methods are rejected before touching the database', async () => {
  for (const method of ['POST','PUT','PATCH','DELETE']) {
    const response = await onRequest({ request:new Request('https://food.example/api/counts',{method}), env:{} });
    assert.equal(response.status,405);
  }
});

test('anonymous and malformed authorization are rejected', async () => {
  for (const authorization of ['', 'Basic $$$', 'Bearer token', 'Basic ' + btoa('nocolon')]) {
    const response = await onRequest({ request:new Request('https://food.example/api/counts',{headers:{authorization}}), env:{} });
    assert.equal(response.status,401);
    assert.equal(response.headers.get('cache-control'),'no-store');
  }
});

test('viewer password is verified; only SELECT queries and totals are returned', async () => {
  const db = new DatabaseSync(':memory:');
  const salt = 'test-salt';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('test-password'), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:1000,hash:'SHA-256'},key,256);
  const hash = Buffer.from(bits).toString('hex');
  db.exec('CREATE TABLE admin_users(username TEXT, attendance_access TEXT, password_hash TEXT, password_salt TEXT, password_iterations INTEGER)');
  for (const [username,access] of [['user1','read'],['admin','write'],['owner','none']]) db.prepare('INSERT INTO admin_users VALUES(?,?,?,?,?)').run(username,access,hash,salt,1000);
  const env = { DB:{ prepare(sql) {
    assert.match(sql.trim(), /^SELECT/);
    if (sql === COUNTS_SQL) return {first:async()=>({present:2,veg:1,nonVeg:1,unrecorded:0})};
    return {bind:(...args)=>({first:async()=>db.prepare(sql).get(...args)})};
  } } };
  for (const [credentials,status] of [['user1:test-password',200],['user1:wrong',401],['admin:test-password',401],['owner:test-password',401]]) {
    const response = await onRequest({request:new Request('https://food.example/api/counts',{headers:{authorization:'Basic '+btoa(credentials)}}),env});
    assert.equal(response.status,status);
    if(status===200) assert.deepEqual(Object.keys(await response.json()).sort(),['counts','updatedAt']);
  }
  db.close();
});
