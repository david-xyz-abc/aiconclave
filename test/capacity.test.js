import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { onRequestPost } from '../functions/api/register.js'
import { onRequestGet } from '../functions/api/registration-capacity.js'
import { createSession } from '../functions/_lib/session.js'
import { getHackathonCapacity } from '../functions/_lib/capacity.js'

function fixture(students) {
  const sql = new DatabaseSync(':memory:')
  sql.exec('PRAGMA foreign_keys=ON')
  const migrations = new URL('../db/migrations/', import.meta.url)
  for (const name of readdirSync(migrations).sort()) sql.exec(readFileSync(new URL(name, migrations), 'utf8'))
  const db = {
    prepare(query) {
      let args = []
      const statement = {
        bind(...values) { args = values; return statement },
        async first() { return sql.prepare(query).get(...args) ?? null },
        async all() { return { results: sql.prepare(query).all(...args) } },
        async run() { return { meta: sql.prepare(query).run(...args) } },
        execute() { return { meta: sql.prepare(query).run(...args) } },
      }
      return statement
    },
    async batch(statements) {
      sql.exec('BEGIN IMMEDIATE')
      try { const result = statements.map(s => s.execute()); sql.exec('COMMIT'); return result }
      catch (error) { sql.exec('ROLLBACK'); throw error }
    },
  }
  let nextId = 1
  function account() {
    const id = nextId++
    sql.prepare('INSERT INTO participant_accounts (id, google_sub, email) VALUES (?, ?, ?)').run(id, String(id), `person${id}@example.test`)
    return id
  }
  function seedTeam(size, submitted = true, category = 'College') {
    const id = account()
    sql.prepare(`INSERT INTO hackathon_teams (id, team_code, team_name, team_name_key, captain_account_id, participant_category, team_size, sector_track, solution_type, information_confirmed, rules_accepted, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Education', 'Technical', 1, 1, ?)`).run(id, `seed${id}`, `seed${id}`, `seed${id}`, id, category, Math.max(2, size), submitted ? '2026-09-01' : null)
    for (let i = 1; i <= size; i++) addMember(id, i)
    return id
  }
  function addMember(team, order) {
    sql.prepare(`INSERT INTO hackathon_team_members (team_id, member_order, role, full_name, email, email_key, phone, institution, year_or_grade)
      VALUES (?, ?, ?, 'Test student', ?, ?, '+919876543210', 'Test college', '2')`).run(team, order, order === 1 ? 'Captain' : 'Member', `t${team}m${order}@example.test`, `t${team}m${order}@example.test`)
  }
  for (let count = 0; count < students; count += 4) seedTeam(Math.min(4, students - count))
  async function submit(size, category = 'College') {
    const id = account()
    const session = await createSession(db, id)
    const background = []
    const response = await onRequestPost({ env: { DB: db }, waitUntil: task => background.push(task), request: new Request('https://site.test/api/register', {
      method: 'POST', headers: { origin: 'https://site.test', 'content-type': 'application/json', cookie: session.cookie.split(';')[0] },
      body: JSON.stringify({ registrationType: 'hackathon', teamName: `newteam${id}`, participantCategory: category, sectorTrack: 'Education', solutionType: 'Technical', informationConfirmed: true, rulesAccepted: true,
        members: Array.from({ length: size }, (_, i) => ({ fullName: 'Test student', email: i ? `new${id}m${i}@example.test` : `person${id}@example.test`, phone: '9876543210', institution: 'Test college', departmentOrCourse: 'CS', yearOrGrade: '2' })) }),
    }) })
    await Promise.all(background)
    return response
  }
  return { sql, db, submit, seedTeam, addMember }
}


test('school and college share a hard limit of 1990 participants', async () => {
  const f = fixture(1986)
  assert.equal((await f.submit(2, 'College')).status, 201)
  assert.equal((await f.submit(2, 'School')).status, 201)
  const response = await onRequestGet({ env: { DB: f.db } })
  const { hackathon } = await response.json()
  assert.equal(hackathon.students, 1990)
  assert.equal(hackathon.limit, 1990)
  assert.equal(hackathon.remaining, 0)
  assert.equal(hackathon.open, false)
  assert.equal(hackathon.schoolOpen, false)
  assert.equal(hackathon.collegeOpen, false)
  assert.equal((await f.submit(2)).status, 409)
  f.sql.close()
})

test('an oversized team is rejected without saving a team, members, claims or email', async () => {
  const f = fixture(1987)
  const counts = () => ['hackathon_teams', 'hackathon_team_members', 'hackathon_member_claims', 'registration_email_deliveries'].map(table => f.sql.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n)
  const before = counts()
  assert.equal((await f.submit(4)).status, 409)
  assert.deepEqual(counts(), before)
  assert.equal((await f.submit(3)).status, 201)
  f.sql.close()
})

test('concurrent final teams cannot overbook or leave a partial registration', async () => {
  const f = fixture(1988)
  const responses = await Promise.all([f.submit(2, 'School'), f.submit(2, 'College')])
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409])
  assert.equal((await getHackathonCapacity(f.db)).students, 1990)
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM registration_email_deliveries').get().n, 1)
  f.sql.close()
})

test('one remaining place closes registration because teams need at least two', async () => {
  const f = fixture(1989)
  assert.equal((await getHackathonCapacity(f.db)).open, false)
  assert.equal((await f.submit(2)).status, 409)
  f.sql.close()
})

test('database guards cover older clients, member moves and draft submissions', async () => {
  const f = fixture(1988)
  const draft = f.seedTeam(3, false)
  assert.throws(() => f.sql.prepare('UPDATE hackathon_teams SET submitted_at = ? WHERE id = ?').run('2026-09-13', draft), /hackathon_capacity_exceeded/)
  const team = f.seedTeam(2)
  assert.throws(() => f.addMember(team, 3), /hackathon_capacity_exceeded/)
  assert.throws(() => f.sql.prepare('UPDATE hackathon_team_members SET team_id = ?, member_order = 3 WHERE team_id = ? AND member_order = 3').run(team, draft), /hackathon_capacity_exceeded/)
  assert.equal((f.sql.prepare('SELECT submitted_at FROM hackathon_teams WHERE id = ?').get(draft)).submitted_at, null)
  f.sql.close()
})

test('database batch rolls back all members if an older client exceeds capacity', async () => {
  const f = fixture(1988)
  const team = f.seedTeam(0)
  const insert = order => f.db.prepare(`INSERT INTO hackathon_team_members (team_id, member_order, role, full_name, email, email_key, phone, institution, year_or_grade) VALUES (?, ?, ?, 'Test', ?, ?, '+919876543210', 'Test', '2')`).bind(team, order, order === 1 ? 'Captain' : 'Member', `batch${order}@test.example`, `batch${order}@test.example`)
  await assert.rejects(f.db.batch([insert(1), insert(2), insert(3)]), /hackathon_capacity_exceeded/)
  assert.equal((await getHackathonCapacity(f.db)).students, 1988)
  f.sql.close()
})
