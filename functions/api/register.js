import { isSameOrigin, json, readJsonBody } from '../_lib/http.js'
import { HACKATHON_CHALLENGES, isValidHackathonSelection } from '../_lib/hackathon.js'
import { getParticipantSession } from '../_lib/session.js'

const ALLOWED_PARTICIPANT_TYPES = new Set(['Student', 'Faculty / Academic', 'Professional / Industry Delegate', 'Researcher', 'Other'])
const ALLOWED_PANELS = new Set(['AI in Agriculture', 'AI in Education', 'AI in Healthcare'])
const ALLOWED_SECTORS = new Set(['', 'Agriculture', 'Education', 'Healthcare', 'IT / Technology', 'Government', 'Other'])
const ALLOWED_ORGANISATION_TYPES = new Set(['', 'Startup', 'MSME', 'Corporate', 'Government', 'Academic Institution', 'Research Organization', 'NGO', 'Other'])
const ALLOWED_HACKATHON_TYPES = new Set(['Student', 'Faculty', 'Professional / Industry Delegate', 'Researcher', 'Other'])
const ALLOWED_HACKATHON_TRACKS = new Set(['Hackathon (Technical)', 'Hackathon (Non-Technical)'])

const MAX_LEN = {
  name: 120,
  email: 254,
  phone: 40,
  organisation: 200,
  category: 80,
  ideaSummary: 800,
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
    const name = trimStr(body.name, MAX_LEN.name)
    const email = participant?.email || trimStr(body.email, MAX_LEN.email)
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
      const result = await db.prepare(`INSERT INTO panel_registrations (name, email, phone, participant_type, organisation, department, panel_selection, industry_sector, industry_sector_other, organisation_type, organisation_type_other, information_confirmed, updates_opt_in, participant_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(name, email, phone, participantType, organisation, department, panelSelection, industrySector, industrySectorOther, organisationType, organisationTypeOther, 1, updatesOptIn ? 1 : 0, participant?.id ?? null).run()
      return json({ ok: true, id: result?.meta?.last_row_id ?? null, registration: { name, email, phone, participantType, organisation, department, panelSelection, industrySector, industrySectorOther, organisationType, organisationTypeOther, updatesOptIn } }, 201)
    } catch (error) {
      console.error(JSON.stringify({ event: 'panel_registration_insert_failed', reason: error instanceof Error ? error.message : 'unknown' }))
      return json({ ok: false, error: 'Could not save panel registration. Try again.' }, 500)
    }
  }

  if (body.registrationType === 'hackathon') {
    const name = trimStr(body.name, MAX_LEN.name)
    const email = participant?.email || trimStr(body.email, MAX_LEN.email)
    const phone = trimStr(body.phone, MAX_LEN.phone)
    const participantType = trimStr(body.category, MAX_LEN.category)
    const organisation = trimStr(body.organisation, MAX_LEN.organisation)
    const tracks = Array.isArray(body.tracks)
      ? [...new Set(body.tracks.map((track) => trimStr(track, 80)).filter((track) => ALLOWED_HACKATHON_TRACKS.has(track)))]
      : []
    const challengeArea = trimStr(body.challengeArea, 80)
    const subcategory = trimStr(body.subcategory, 120)
    const problemArea = trimStr(body.problemArea, 180)
    const ideaSummary = trimStr(body.ideaSummary, MAX_LEN.ideaSummary)
    const informationConfirmed = body.informationConfirmed === true
    const fields = {}

    if (!name) fields.name = 'Enter your full name.'
    if (!email) fields.email = 'Enter your email address.'
    else if (!isValidEmail(email)) fields.email = 'Enter a valid email address, for example name@example.com.'
    if (!phone) fields.phone = 'Enter your phone number.'
    else if (!isValidPhone(phone)) fields.phone = 'Enter a valid phone number containing 7 to 15 digits.'
    if (!ALLOWED_HACKATHON_TYPES.has(participantType)) fields.category = 'Choose your participant type.'
    if (!organisation) fields.organisation = 'Enter your school, college or organization name.'
    if (!Array.isArray(body.tracks) || tracks.length !== new Set(body.tracks).size || !tracks.length) fields.tracks = 'Choose at least one valid hackathon track.'
    if (!HACKATHON_CHALLENGES[challengeArea]) fields.challengeArea = 'Choose a valid challenge sector.'
    else if (!HACKATHON_CHALLENGES[challengeArea][subcategory]) fields.subcategory = 'Choose a valid subcategory.'
    else if (!isValidHackathonSelection(challengeArea, subcategory, problemArea)) fields.problemArea = 'Choose a valid suggested problem area.'
    if (!informationConfirmed) fields.informationConfirmed = 'Confirm that the information provided is accurate.'
    if (Object.keys(fields).length) return json({ ok: false, error: 'Please review the highlighted fields.', fields }, 400)

    try {
      const result = await db.prepare(`INSERT INTO hackathon_registrations (name, email, phone, participant_type, organisation, tracks, challenge_area, subcategory, problem_area, idea_summary, information_confirmed, participant_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(name, email, phone, participantType, organisation, JSON.stringify(tracks), challengeArea, subcategory, problemArea, ideaSummary, 1, participant?.id ?? null).run()
      return json({ ok: true, id: result?.meta?.last_row_id ?? null, registration: { name, email, phone, participantType, organisation, tracks, challengeArea, subcategory, problemArea, ideaSummary } }, 201)
    } catch (error) {
      console.error(JSON.stringify({ event: 'hackathon_registration_insert_failed', reason: error instanceof Error ? error.message : 'unknown' }))
      return json({ ok: false, error: 'Could not save hackathon registration. Try again.' }, 500)
    }
  }
  return json({ ok: false, error: 'Choose a valid registration type.' }, 400)
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context)
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } })
  return json({ ok: false, error: 'Method not allowed.' }, 405)
}
