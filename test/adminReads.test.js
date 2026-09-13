import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { getRegistrationTables, loadRegistrationDirectory, loadHackathonRegistrations } from '../functions/_shared/registrations.js';

test('admin directory omits full rosters; detail scopes reads to one team; export includes everyone', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  const queries = [];
  const db = { prepare(sql) {
    let args = [];
    const statement = { bind(...values) { args = values; return statement; }, all() {
      queries.push({ sql, args });
      return { results: sqlite.prepare(sql).all(...args) };
    } };
    return statement;
  } };
  try {
    for (let id = 1; id <= 2; id++) {
      sqlite.prepare("INSERT INTO participant_accounts (id, google_sub, email) VALUES (?, ?, ?)").run(id, `sub-${id}`, `account-${id}@test`);
      sqlite.prepare(`INSERT INTO hackathon_teams(id, team_name, team_name_key, captain_account_id,
        participant_category, team_size, sector_track, solution_type, submitted_at)
        VALUES (?, ?, ?, ?, 'College', 2, 'Agriculture', 'Technical', '2026-09-13')`).run(id, `Team ${id}`, `team-${id}`, id);
      for (let order = 1; order <= 2; order++) sqlite.prepare(`INSERT INTO hackathon_team_members
        (team_id, member_order, role, full_name, email, email_key, phone, institution, year_or_grade)
        VALUES (?, ?, ?, ?, ?, ?, '123', 'College', '1')`).run(id, order, order === 1 ? 'Captain' : 'Member', `Name ${id}-${order}`, `${id}-${order}@test`, `${id}-${order}@test`);
    }
    const tables = await getRegistrationTables(db);
    const directory = await loadRegistrationDirectory(db, tables, 'hackathon');
    assert.equal(directory.length, 2);
    assert.equal(directory[0].team_size, 2);
    assert.equal(directory[0].captain_name, 'Name 1-1');
    assert.equal('members' in directory[0], false);
    queries.length = 0;
    const detail = await loadHackathonRegistrations(db, tables, 2, 'team');
    assert.equal(detail.length, 1);
    assert.equal(detail[0].id, 2);
    assert.equal(detail[0].members.length, 2);
    assert.equal(detail[0].members[0].phone, '123');
    assert.equal(queries.length, 1);
    assert.deepEqual(queries[0].args, [2]);
    assert.match(queries[0].sql, /AND t.id = \?/);
    assert.equal((await loadHackathonRegistrations(db, tables, 999, 'team')).length, 0);
    const exported = await loadHackathonRegistrations(db, tables);
    assert.equal(exported.length, 2);
    assert.equal(exported.flatMap(team => team.members).length, 4);
  } finally { sqlite.close(); }
});
