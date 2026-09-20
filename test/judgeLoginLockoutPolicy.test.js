import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { judgingFixture } from './judgingFixture.js';
import { onRequest } from '../judging/functions/api/auth.js';
import { hashPassword } from '../functions/_shared/auth.js';

const migration = readFileSync(new URL('../db/migrations/0040_disable_judge_login_lockout.sql', import.meta.url), 'utf8');
const login = (DB, role, password = 'correct') => onRequest({
  env: { DB },
  request: new Request('https://test.example/api/auth', {
    method: 'POST',
    headers: { origin: 'https://test.example', 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'staff', role, password }),
  }),
});

async function setup(role = 'judge') {
  const f = judgingFixture();
  f.sqlite.exec("INSERT INTO judging_judges(id,name) VALUES('policy-judge','Policy test')");
  f.sqlite.prepare('UPDATE judging_users SET role=?,judge_id=?,password_hash=?,password_salt=? WHERE id=?')
    .run(role, role === 'judge' ? 'policy-judge' : null,
      await hashPassword('correct', 'test-salt', 100000), 'test-salt', 'test-user');
  return f;
}

test('migration releases existing judge locks and repeated failures never prevent correct login', async () => {
  const f = await setup();
  f.sqlite.exec("UPDATE judging_users SET failed_attempts=5,locked_until=unixepoch()+900");
  assert.equal((await login(f.DB, 'judge')).status, 429);
  f.sqlite.exec(migration);
  f.sqlite.exec(migration); // Repeat-safe.
  for (let i = 0; i < 7; i++) assert.equal((await login(f.DB, 'judge', 'wrong')).status, 401);
  const state = f.sqlite.prepare("SELECT failed_attempts,locked_until FROM judging_users WHERE id='test-user'").get();
  assert.equal(state.failed_attempts, 0);
  assert.equal(state.locked_until, 0);
  const response = await login(f.DB, 'judge');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/);
  f.sqlite.exec('UPDATE judging_login_control SET enabled=0');
  assert.equal((await login(f.DB, 'judge')).status, 403);
  f.sqlite.close();
});

test('venue-admin lockouts remain enforced with the new judge policy', async () => {
  const f = await setup('venue_admin');
  f.sqlite.exec(migration);
  for (let i = 0; i < 5; i++) assert.equal((await login(f.DB, 'venue_admin', 'wrong')).status, 401);
  assert.equal((await login(f.DB, 'venue_admin')).status, 429);
  assert.ok(f.sqlite.prepare("SELECT locked_until FROM judging_users WHERE id='test-user'").get().locked_until > Date.now() / 1000);
  f.sqlite.close();
});
