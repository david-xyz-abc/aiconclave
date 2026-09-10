import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPatch } from '../functions/api/attendance/teams/[id].js';

async function change({ marked, editingAttendance, access = 'write' }) {
  const sql = new DatabaseSync(':memory:');
  sql.exec("CREATE TABLE hackathon_teams (id INTEGER PRIMARY KEY, attendance_lead_member_id INTEGER, updated_at TEXT, submitted_at TEXT); INSERT INTO hackathon_teams VALUES (1, 11, NULL, '2026-09-16'); CREATE TABLE hackathon_attendance (team_id INTEGER);");
  if (marked) sql.exec('INSERT INTO hackathon_attendance VALUES (1)');
  const DB = { prepare(query) {
    let args = [];
    const stmt = {
      bind(...values) { args = values; return stmt; },
      async first() { return query.includes('attendance_sessions') ? { attendance_access: access } : { id: 1, lead_member_id: 11 }; },
      async all() { return { results: [] }; },
      async run() { return { meta: sql.prepare(query).run(...args) }; },
    };
    return stmt;
  } };
  try {
    const response = await onRequestPatch({ env: { DB }, params: { id: '1' }, request: new Request('https://test.example/api/attendance/teams/1', {
      method: 'PATCH', headers: { 'content-type': 'application/json', cookie: '__Host-aiconclave_attendance_session=test' },
      body: JSON.stringify({ leadMemberId: 12, editingAttendance }),
    }) });
    return { status: response.status, lead: sql.prepare('SELECT attendance_lead_member_id AS lead FROM hackathon_teams').get().lead };
  } finally { sql.close(); }
}

test('lead changes are allowed before attendance is marked', async () => {
  assert.deepEqual(await change({ marked: false }), { status: 200, lead: 12 });
});

test('marked attendance locks lead changes unless editing is explicitly requested', async () => {
  for (const editingAttendance of [undefined, false, 'true']) {
    assert.deepEqual(await change({ marked: true, editingAttendance }), { status: 409, lead: 11 });
  }
});

test('Edit permits an admin to change the lead of marked attendance', async () => {
  assert.deepEqual(await change({ marked: true, editingAttendance: true }), { status: 200, lead: 12 });
});

test('editing flag does not grant a viewer write access', async () => {
  assert.deepEqual(await change({ marked: true, editingAttendance: true, access: 'read' }), { status: 403, lead: 11 });
});
