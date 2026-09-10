import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestPost } from '../functions/api/attendance/teams/[id].js';

async function save(attendance, access = 'write') {
  let writes = 0;
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE hackathon_attendance (id INTEGER PRIMARY KEY, team_id INTEGER, member_id INTEGER, attendance_date TEXT, present INTEGER, marked_by TEXT, marked_at TEXT, UNIQUE(team_id, member_id, attendance_date));
    INSERT INTO hackathon_attendance (team_id, member_id, attendance_date, present) VALUES (1, 11, '2026-09-16', 1);`);
  sqlite.exec(readFileSync(new URL('../db/migrations/0017_attendance_meals.sql', import.meta.url), 'utf8'));
  const DB = {
    prepare(sql) {
      let args = [];
      const statement = {
        run() { sqlite.prepare(sql).run(...args); },
        bind(...values) { args = values; return statement; },
        async first() {
          if (sql.includes('attendance_sessions')) return { attendance_access: access };
          return { id: 1, lead_member_id: 11 };
        },
        async all() {
          if (sql.includes('SELECT id FROM hackathon_team_members')) return { results: [...new Set(args.slice(1))].filter(id => [11, 12, 13].includes(id)).map(id => ({ id })) };
          return { results: [] };
        },
      };
      return statement;
    },
    async batch(statements) { statements.forEach(statement => statement.run()); writes++; },
  };
  const response = await onRequestPost({ env: { DB }, params: { id: '1' }, request: new Request('https://test.example/api/attendance/teams/1', {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: '__Host-aiconclave_attendance_session=test-session' },
    body: JSON.stringify({ date: '2026-09-16', attendance }),
  }) });
  const rows = sqlite.prepare('SELECT member_id, present, meal_preference FROM hackathon_attendance ORDER BY member_id').all();
  sqlite.close();
  return { status: response.status, data: await response.json(), writes, rows };
}

test('zero or one present member cannot save attendance', async () => {
  for (const present of [false, true]) {
    const result = await save([{ memberId: 11, present }, { memberId: 12, present: false }]);
    assert.equal(result.status, 400);
    assert.match(result.data.error, /At least two/);
    assert.equal(result.writes, 0);
  }
});

test('two present members including the lead can save', async () => {
  const result = await save([{ memberId: 11, present: true, mealPreference: 'Veg' }, { memberId: 12, present: true, mealPreference: 'Non-Veg' }, { memberId: 13, present: false }]);
  assert.equal(result.status, 200);
  assert.equal(result.writes, 1);
  assert.deepEqual(result.rows.map(row => [row.member_id, row.present, row.meal_preference]), [[11, 1, 'Veg'], [12, 1, 'Non-Veg'], [13, 0, null]]);
});

test('absent members have no meal even when a stale preference is submitted', async () => {
  const result = await save([{ memberId: 11, present: true, mealPreference: 'Veg' }, { memberId: 12, present: true, mealPreference: 'Non-Veg' }, { memberId: 13, present: false, mealPreference: 'Veg' }]);
  assert.equal(result.status, 200);
  assert.equal(result.rows[2].meal_preference, null);
});

test('two present members without the lead cannot save', async () => {
  const result = await save([{ memberId: 11, present: false }, { memberId: 12, present: true }, { memberId: 13, present: true }]);
  assert.equal(result.status, 400);
  assert.match(result.data.error, /team lead must be present/);
  assert.equal(result.writes, 0);
});

test('duplicate members, non-boolean statuses and outsiders cannot bypass minimum', async () => {
  for (const attendance of [
    [{ memberId: 11, present: true }, { memberId: 11, present: true }],
    [{ memberId: 11, present: true }, { memberId: 12, present: 'true' }],
    [{ memberId: 11, present: true }, { memberId: 99, present: true }],
  ]) {
    const result = await save(attendance);
    assert.equal(result.status, 400);
    assert.equal(result.writes, 0);
  }
});

test('viewers remain unable to mark attendance', async () => {
  const result = await save([{ memberId: 11, present: true }, { memberId: 12, present: true }], 'read');
  assert.equal(result.status, 403);
  assert.equal(result.writes, 0);
});

test('present members require an explicit valid meal choice', async () => {
  for (const mealPreference of [undefined, null, '', 'Other']) {
    const result = await save([{ memberId: 11, present: true, mealPreference: 'Veg' }, { memberId: 12, present: true, mealPreference }]);
    assert.equal(result.status, 400);
    assert.match(result.data.error, /Choose Veg/);
    assert.equal(result.writes, 0);
  }
});
