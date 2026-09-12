import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function fixture(access = 'write', tableSeating = true) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE hackathon_teams (id INTEGER PRIMARY KEY, team_code TEXT, team_name TEXT,
      participant_category TEXT, sector_track TEXT, solution_type TEXT, team_size INTEGER,
      attendance_lead_member_id INTEGER, submitted_at TEXT, updated_at TEXT);
    CREATE TABLE hackathon_team_members (id INTEGER PRIMARY KEY, team_id INTEGER REFERENCES hackathon_teams(id),
      full_name TEXT, email TEXT, institution TEXT, role TEXT, member_order INTEGER);
    CREATE TABLE hackathon_attendance (id INTEGER PRIMARY KEY, team_id INTEGER, member_id INTEGER,
      attendance_date TEXT, present INTEGER, meal_preference TEXT, marked_by TEXT,
      marked_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(team_id, member_id, attendance_date));
    INSERT INTO hackathon_teams VALUES (1,'AIC-1','Git-R-Done','College','Agriculture','Technical',3,NULL,'2026-09-11',NULL);
    INSERT INTO hackathon_team_members VALUES (11,1,'Captain','','','Captain',1),(12,1,'Member 2','','','Member',2),(13,1,'Member 3','','','Member',3);`);
  sqlite.exec(readFileSync(new URL('../db/migrations/0019_venue_allocation.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../db/migrations/0020_alpha_venue_plan.sql', import.meta.url), 'utf8'));
  if (tableSeating) sqlite.exec(readFileSync(new URL('../db/migrations/0024_table_seating.sql', import.meta.url), 'utf8'));
  let writes = 0;
  const DB = { prepare(sql) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      first() { return sql.includes('attendance_sessions') ? { attendance_access: access, username: 'staff' } : sqlite.prepare(sql).get(...args) || null; },
      all() { return { results: sqlite.prepare(sql).all(...args) }; },
      run() { return { meta: sqlite.prepare(sql).run(...args) }; },
      sql, get args() { return args; },
    };
    return statement;
  }, async batch(statements) {
    sqlite.exec('BEGIN');
    try {
      const result = statements.map(s => /^\s*SELECT/i.test(s.sql) ? s.all() : s.run());
      sqlite.exec('COMMIT'); writes++; return result;
    } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
  } };
  return { sqlite, DB, get writes() { return writes; } };
}

export function context(DB, body, method = 'POST', path = 'teams/1') {
  return { env: { DB }, params: { id: '1' }, request: new Request(`https://test.example/api/attendance/${path}`, {
    method, headers: { origin: 'https://test.example', 'content-type': 'application/json', cookie: '__Host-aiconclave_attendance_session=test' },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  }) };
}
