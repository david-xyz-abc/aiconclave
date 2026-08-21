import { isSameOrigin, json, readJsonBody } from '../_lib/http.js'
import { getParticipantSession } from '../_lib/session.js'

const ALLOWED_PARTICIPANT_TYPES = new Set(['Student', 'Faculty / Academic', 'Professional / Industry Delegate', 'Researcher', 'Other'])
const ALLOWED_PANELS = new Set(['AI in Agriculture', 'AI in Education', 'AI in Healthcare'])
const ALLOWED_SECTORS = new Set(['', 'Agriculture', 'Education', 'Healthcare', 'IT / Technology', 'Government', 'Other'])
const ALLOWED_ORGANISATION_TYPES = new Set(['', 'Startup', 'MSME', 'Corporate', 'Government', 'Academic Institution', 'Research Organization', 'NGO', 'Other'])
const ALLOWED_HACKATHON_CATEGORIES = new Set(['School', 'College'])
const ALLOWED_HACKATHON_SECTORS = new Set(['Agriculture', 'Education', 'Healthcare'])
const ALLOWED_SOLUTION_TYPES = new Set(['Technical', 'Non-Technical'])

const MAX_LEN = {
  name: 120,
  email: 254,
  phone: 40,
  organisation: 200,
  teamName: 100,
  departmentOrCourse: 160,
  yearOrGrade: 80,
}

function trimStr(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '')
  return /^[+\d\s().-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15
}

function normalizedKey(value) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function teamCode() {
  return `AIC26-H-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
}

export async function onRequestPost(context) {
  const db = context.env?.DB
  if (!db) return json({ ok: false, error: 'Registration service is not configured.' }, 503)
  if (!isSameOrigin(context.request)) return json({ ok: false, error: 'This registration request could not be verified.' }, 403)

  let participant
  try {
    participant = await getParticipantSession(context.request, db)
  } catch (error) {
    console.error(JSON.stringify({ event: 'registration_session_failed', reason: error instanceof Error ? error.message : 'unknown' }))
    return json({ ok: false, error: 'We could not verify your sign-in. Please try again.' }, 500)
  }
  let body
  try {
    body = await readJsonBody(context.request)
  } catch {
    return json({ ok: false, error: 'The registration request was invalid.' }, 400)
  }

  if (!body || typeof body !== 'object') return json({ ok: false, error: 'Invalid request body.' }, 400)

  if (body.registrationType === 'panel') {
    if (!participant) return json({ ok: false, error: 'Sign in with Google before registering for a panel discussion.' }, 401)

    const name = trimStr(body.name, MAX_LEN.name)
    const email = participant.email
    const phone = trimStr(body.phone, MAX_LEN.phone)
    const participantType = trimStr(body.participantType, 80)
    const organisation = trimStr(body.organisation, MAX_LEN.organisation)
    const department = trimStr(body.department, 160)
    const panelSelection = trimStr(body.panelSelection, 80)
    const industrySector = trimStr(body.industrySector, 80)
    const industrySectorOther = trimStr(body.industrySectorOther, 160)
    const organisationType = trimStr(body.organisationType, 80)
    const organisationTypeOther = trimStr(body.organisationTypeOther, 160)
    const informationConfirmed = body.informationConfirmed === true
    const updatesOptIn = body.updatesOptIn === true
    const fields = {}
    if (!name) fields.name = 'Enter your full name.'
    if (!email) fields.email = 'Enter your email address.'
    else if (!isValidEmail(email)) fields.email = 'Enter a valid email address, for example name@example.com.'
    if (!phone) fields.phone = 'Enter your phone number.'
    else if (!isValidPhone(phone)) fields.phone = 'Enter a valid phone number containing 7 to 15 digits.'
    if (!ALLOWED_PARTICIPANT_TYPES.has(participantType)) fields.participantType = 'Choose your participant type.'
    if (!organisation) fields.organisation = 'Enter your college, institution or organization name.'
    if (!ALLOWED_PANELS.has(panelSelection)) fields.panelSelection = 'Choose the panel discussion you want to attend.'
    if (!ALLOWED_SECTORS.has(industrySector)) fields.industrySector = 'Choose a valid industry sector.'
    if (!ALLOWED_ORGANISATION_TYPES.has(organisationType)) fields.organisationType = 'Choose a valid organization type.'
    if (industrySector === 'Other' && !industrySectorOther) fields.industrySectorOther = 'Specify your industry sector.'
    if (organisationType === 'Other' && !organisationTypeOther) fields.organisationTypeOther = 'Specify your organization type.'
    if (!informationConfirmed) fields.informationConfirmed = 'Confirm that the information provided is accurate.'
    if (Object.keys(fields).length) return json({ ok: false, error: 'Please review the highlighted fields.', fields }, 400)

    try {
      const existingRegistration = await db.prepare('SELECT id FROM panel_registrations WHERE participant_account_id = ? OR email = ? COLLATE NOCASE LIMIT 1').bind(participant.id, email).first()
      if (existingRegistration) return json({ ok: false, error: 'You have already registered for the panel discussion. Open My registrations to view it.' }, 409)

      const result = await db.prepare(`INSERT INTO panel_registrations (name, email, phone, participant_type, organisation, department, panel_selection, industry_sector, industry_sector_other, organisation_type, organisation_type_other, information_confirmed, updates_opt_in, participant_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(name, email, phone, participantType, organisation, department, panelSelection, industrySector, industrySectorOther, organisationType, organisationTypeOther, 1, updatesOptIn ? 1 : 0, participant?.id ?? null).run()
      return json({ ok: true, id: result?.meta?.last_row_id ?? null, registration: { name, email, phone, participantType, organisation, department, panelSelection, industrySector, industrySectorOther, organisationType, organisationTypeOther, updatesOptIn } }, 201)
    } catch (error) {
      console.error(JSON.stringify({ event: 'panel_registration_insert_failed', reason: error instanceof Error ? error.message : 'unknown' }))
      if (error instanceof Error && error.message.includes('one_panel_registration_per_participant')) return json({ ok: false, error: 'You have already registered for the panel discussion. Open My registrations to view it.' }, 409)
      return json({ ok: false, error: 'Could not save panel registration. Try again.' }, 500)
    }
  }

  if (body.registrationType === 'hackathon') {
    if (!participant) return json({ ok: false, error: 'Sign in with Google before registering a hackathon team.' }, 401)

    const name = trimStr(body.teamName, MAX_LEN.teamName).replace(/\s+/g, ' ')
    const nameKey = normalizedKey(name)
    const participantCategory = trimStr(body.participantCategory, 20)
    const sectorTrack = trimStr(body.sectorTrack, 30)
    const solutionType = trimStr(body.solutionType, 30)
    const rawMembers = Array.isArray(body.members) ? body.members.slice(0, 5) : []
    const members = rawMembers.map((member, index) => {
      const email = index === 0 ? participant.email : trimStr(member?.email, MAX_LEN.email).toLowerCase()
      const phoneInput = trimStr(member?.phone, 10)
      return {
        fullName: trimStr(member?.fullName, MAX_LEN.name),
        email,
        emailKey: normalizedKey(email),
        phoneInput,
        phone: `+91${phoneInput}`,
        institution: trimStr(member?.institution, MAX_LEN.organisation),
        departmentOrCourse: trimStr(member?.departmentOrCourse, MAX_LEN.departmentOrCourse),
        yearOrGrade: trimStr(member?.yearOrGrade, MAX_LEN.yearOrGrade),
      }
    })
    const informationConfirmed = body.informationConfirmed === true
    const rulesAccepted = body.rulesAccepted === true
    const updatesOptIn = body.updatesOptIn === true
    const fields = {}

    if (name.length < 2) fields.teamName = 'Enter a team name using at least 2 characters.'
    if (!ALLOWED_HACKATHON_CATEGORIES.has(participantCategory)) fields.participantCategory = 'Choose School or College.'
    if (!ALLOWED_HACKATHON_SECTORS.has(sectorTrack)) fields.sectorTrack = 'Choose one valid hackathon sector.'
    if (!ALLOWED_SOLUTION_TYPES.has(solutionType)) fields.solutionType = 'Choose Technical or Non-Technical.'
    if (rawMembers.length < 2 || rawMembers.length > 4) fields.members = 'A team must have 2 to 4 students.'

    const seenEmails = new Set()
    members.forEach((member, index) => {
      const prefix = `members.${index}`
      if (member.fullName.length < 2) fields[`${prefix}.fullName`] = 'Enter the student’s full name.'
      if (!isValidEmail(member.email)) fields[`${prefix}.email`] = 'Enter a valid email address.'
      else if (seenEmails.has(member.emailKey)) fields[`${prefix}.email`] = 'Each student must use a different email address.'
      else seenEmails.add(member.emailKey)
      if (!/^\d{10}$/.test(member.phoneInput)) fields[`${prefix}.phone`] = 'Enter exactly 10 digits after +91.'
      if (member.institution.length < 2) fields[`${prefix}.institution`] = `Enter the student’s ${participantCategory === 'School' ? 'school' : 'college'} name.`
      if (participantCategory === 'College' && member.departmentOrCourse.length < 2) fields[`${prefix}.departmentOrCourse`] = 'Enter the department or course.'
      if (!member.yearOrGrade) fields[`${prefix}.yearOrGrade`] = participantCategory === 'School' ? 'Enter the class or grade.' : 'Enter the year of study.'
    })

    if (members[0]?.emailKey !== normalizedKey(participant.email)) fields['members.0.email'] = 'The captain email must match the signed-in Google account.'
    if (!informationConfirmed) fields.informationConfirmed = 'Confirm that the team information is accurate.'
    if (!rulesAccepted) fields.rulesAccepted = 'Confirm that every team member meets the participation rules.'
    if (Object.keys(fields).length) return json({ ok: false, error: 'Please review the highlighted fields.', fields }, 400)

    try {
      const existingTeam = await db.prepare('SELECT id FROM hackathon_teams WHERE team_name_key = ? OR captain_account_id = ? LIMIT 1').bind(nameKey, participant.id).first()
      if (existingTeam) return json({ ok: false, error: 'This team name is already in use, or you have already registered a team.', fields: { teamName: 'Choose another team name, or open My registrations to view your existing team.' } }, 409)

      const placeholders = members.map(() => '?').join(', ')
      const claimedMember = await db.prepare(`SELECT email FROM hackathon_member_claims WHERE email_key IN (${placeholders}) LIMIT 1`).bind(...members.map((member) => member.emailKey)).first()
      if (claimedMember) return json({ ok: false, error: `${claimedMember.email} is already registered in another hackathon team.`, fields: { members: 'Every student can belong to only one submitted team.' } }, 409)

      const code = teamCode()
      const submittedAt = new Date().toISOString()
      const statements = [
        db.prepare(`INSERT INTO hackathon_teams (team_code, team_name, team_name_key, captain_account_id, participant_category, team_size, sector_track, solution_type, information_confirmed, rules_accepted, updates_opt_in, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`).bind(code, name, nameKey, participant.id, participantCategory, members.length, sectorTrack, solutionType, updatesOptIn ? 1 : 0, submittedAt),
        ...members.map((member, index) => db.prepare(`INSERT INTO hackathon_team_members (team_id, member_order, role, account_id, full_name, email, email_key, phone, institution, department_or_course, year_or_grade) SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM hackathon_teams WHERE team_code = ?`).bind(index + 1, index === 0 ? 'Captain' : 'Member', index === 0 ? participant.id : null, member.fullName, member.email, member.emailKey, member.phone, member.institution, member.departmentOrCourse, member.yearOrGrade, code)),
        ...members.map((member, index) => db.prepare(`INSERT INTO hackathon_member_claims (email_key, email, team_id, member_id) SELECT ?, ?, t.id, m.id FROM hackathon_teams t JOIN hackathon_team_members m ON m.team_id = t.id AND m.member_order = ? WHERE t.team_code = ?`).bind(member.emailKey, member.email, index + 1, code)),
      ]
      await db.batch(statements)
      const savedTeam = await db.prepare('SELECT id FROM hackathon_teams WHERE team_code = ?').bind(code).first()
      return json({ ok: true, id: savedTeam?.id ?? null, registration: { teamCode: code, teamName: name, participantCategory, sectorTrack, solutionType, members: members.map(({ phoneInput, emailKey, ...member }) => member), createdAt: submittedAt } }, 201)
    } catch (error) {
      console.error(JSON.stringify({ event: 'hackathon_registration_insert_failed', reason: error instanceof Error ? error.message : 'unknown' }))
      const reason = error instanceof Error ? error.message : ''
      if (reason.includes('hackathon_teams.team_name_key')) return json({ ok: false, error: 'That team name is already registered.', fields: { teamName: 'Choose a different team name.' } }, 409)
      if (reason.includes('hackathon_teams.captain_account_id')) return json({ ok: false, error: 'You have already registered a hackathon team.' }, 409)
      if (reason.includes('hackathon_member_claims.email_key')) return json({ ok: false, error: 'One of these students is already registered in another team.', fields: { members: 'Every student can belong to only one submitted team.' } }, 409)
      return json({ ok: false, error: 'We could not register the team. No partial registration was saved; please try again.' }, 500)
    }
  }
  return json({ ok: false, error: 'Choose a valid registration type.' }, 400)
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context)
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } })
  return json({ ok: false, error: 'Method not allowed.' }, 405)
}
