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

test('whole team fits exactly at public limit', async () => {
  const f = fixture(1292)
  assert.equal((await f.submit(4)).status, 201)
  assert.deepEqual(await getHackathonCapacity(f.db), { students: 1296, category: 'All', limit: 1296, remaining: 0, open: true, collegeOpen: false, schoolOpen: true })
  f.sql.close()
})

test('oversized team rejected without members, claims, team or email; smaller team fits', async () => {
  const f = fixture(1293)
  const before = f.sql.prepare('SELECT COUNT(*) AS n FROM hackathon_teams').get().n
  const response = await f.submit(4)
  assert.equal(response.status, 409)
  assert.equal((await response.json()).capacity.remaining, 3)
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM hackathon_teams').get().n, before)
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM hackathon_member_claims').get().n, 0)
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM registration_email_deliveries').get().n, 0)
  assert.equal((await f.submit(3)).status, 201)
  f.sql.close()
})

test('concurrent submissions cannot both claim final places', async () => {
  const f = fixture(1292)
  const responses = await Promise.all([f.submit(4), f.submit(4)])
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409])
  assert.equal((await getHackathonCapacity(f.db)).students, 1296)
  f.sql.close()
})

test('one remaining college place closes only colleges; drafts do not consume places', async () => {
  const f = fixture(1295)
  f.seedTeam(4, false)
  assert.equal((await getHackathonCapacity(f.db)).collegeOpen, false)
  assert.equal((await getHackathonCapacity(f.db)).open, true)
  assert.equal((await f.submit(2)).status, 409)
  const response = await onRequestGet({ env: { DB: f.db } })
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal((await response.json()).hackathon.students, 1295)
  f.sql.close()
})

test('hard limit blocks member additions, draft submission and moving draft members', () => {
  const f = fixture(1298)
  const team = f.seedTeam(2)
  assert.throws(() => f.addMember(team, 3), /hackathon_capacity_exceeded/)
  const draft = f.seedTeam(2, false)
  assert.throws(() => f.sql.prepare('UPDATE hackathon_teams SET submitted_at = ? WHERE id = ?').run('2026-09-01', draft), /hackathon_capacity_exceeded/)
  assert.throws(() => f.sql.prepare("UPDATE hackathon_team_members SET team_id = ?, member_order = 3, role = 'Member' WHERE team_id = ? AND member_order = 2").run(team, draft), /hackathon_capacity_exceeded/)
  f.sql.close()
})

test('capacity failure never reports registrations open', async () => {
  const response = await onRequestGet({ env: {} })
  assert.equal(response.status, 503)
  assert.equal((await response.json()).ok, false)
})

test('schools count toward the total but remain unlimited beyond the limit', async () => {
  const f = fixture(1300)
  for (let i = 0; i < 5; i++) assert.equal((await f.submit(4, 'School')).status, 201)
  assert.equal((await getHackathonCapacity(f.db)).students, 1320)
  assert.equal((await getHackathonCapacity(f.db)).schoolOpen, true)
  const tampered = await f.submit(4, 'College')
  assert.equal(tampered.status, 409)
  assert.match((await tampered.json()).error, /Registrations concluded for colleges/)
  f.sql.close()
})

test('school members count toward closing colleges at the public cutoff', async () => {
  const f = fixture(1292)
  f.seedTeam(4, true, 'School')
  assert.equal((await getHackathonCapacity(f.db)).remaining, 0)
  assert.equal((await getHackathonCapacity(f.db)).collegeOpen, false)
  assert.equal((await f.submit(4, 'College')).status, 409)
  assert.equal((await f.submit(4, 'School')).status, 201)
  f.sql.close()
})

test('school-to-college recategorization cannot bypass the hard limit', () => {
  const f = fixture(1298)
  const school = f.seedTeam(3, true, 'School')
  assert.throws(() => f.sql.prepare("UPDATE hackathon_teams SET participant_category = 'College' WHERE id = ?").run(school), /hackathon_capacity_exceeded/)
  assert.equal(f.sql.prepare('SELECT participant_category FROM hackathon_teams WHERE id = ?').get(school).participant_category, 'School')
  const fits = 1
  const draftSchool = f.seedTeam(4, false, 'School')
  f.sql.prepare('UPDATE hackathon_teams SET submitted_at = ? WHERE id = ?').run('2026-09-01', draftSchool)
  assert.throws(() => f.sql.prepare("UPDATE hackathon_team_members SET team_id = ?, member_order = 3, role = 'Member' WHERE team_id = ? AND member_order = 2").run(fits, school), /hackathon_capacity_exceeded/)
  f.sql.close()
})

test('concurrent college and school submissions share the count while schools remain open', async () => {
  const f = fixture(1292)
  const responses = await Promise.all([f.submit(4, 'College'), f.submit(4, 'School'), f.submit(4, 'College')])
  assert.equal(responses[1].status, 201)
  const acceptedColleges = [responses[0], responses[2]].filter(r => r.status === 201).length
  assert.ok(acceptedColleges <= 1)
  assert.ok([responses[0], responses[2]].every(r => [201, 409].includes(r.status)))
  assert.equal((await getHackathonCapacity(f.db)).students, 1296 + acceptedColleges * 4)
  f.sql.close()
})

test('school-to-college recategorization at the hard limit does not double count members', () => {
  const f = fixture(1298)
  const school = f.seedTeam(2, true, 'School')
  f.sql.prepare("UPDATE hackathon_teams SET participant_category = 'College' WHERE id = ?").run(school)
  f.sql.close()
})
