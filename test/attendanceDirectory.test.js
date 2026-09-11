import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/attendance/teams.js';

test('directory returns teams with one data query, without unused history payloads', async () => {
  const queries = [];
  const teams = [{ id: 1, team_name: 'Test team', member_count: 4, present_count: 2 }];
  const DB = { prepare(sql) {
    return { bind(...args) {
      return {
        first: async () => ({ attendance_access: 'read' }),
        all: async () => { queries.push({ sql, args }); return { results: teams }; },
      };
    } };
  } };
  const response = await onRequestGet({ env: { DB }, request: new Request('https://test.example/api/attendance/teams?q=Test', {
    headers: { cookie: '__Host-aiconclave_attendance_session=test-session' },
  }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, teams });
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].args, Array(4).fill('%Test%'));
});
