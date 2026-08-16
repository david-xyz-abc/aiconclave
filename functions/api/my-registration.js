import { json } from '../_lib/http.js'
import { getParticipantSession } from '../_lib/session.js'

export async function onRequestGet(context) {
  const db = context.env?.DB
  if (!db) return json({ ok: false, error: 'Registration service is unavailable.' }, 503)
  try {
    const session = await getParticipantSession(context.request, db)
    if (!session) return json({ ok: false, error: 'Sign in to view your registrations.' }, 401)
    const [, result] = await db.batch([
      db.prepare('UPDATE panel_registrations SET participant_account_id = ? WHERE participant_account_id IS NULL AND email = ? COLLATE NOCASE').bind(session.id, session.email),
      db.prepare(`SELECT id, name, email, phone, participant_type, organisation, department, panel_selection, industry_sector, industry_sector_other, organisation_type, organisation_type_other, updates_opt_in, created_at FROM panel_registrations WHERE participant_account_id = ? ORDER BY created_at DESC`).bind(session.id),
    ])
    const registrations = (result.results || []).map((row) => ({
      id: row.id,
      type: 'Panel Discussion',
      status: 'Received',
      name: row.name,
      email: row.email,
      phone: row.phone,
      participantType: row.participant_type,
      organisation: row.organisation,
      department: row.department,
      panelSelection: row.panel_selection,
      industrySector: row.industry_sector,
      industrySectorOther: row.industry_sector_other,
      organisationType: row.organisation_type,
      organisationTypeOther: row.organisation_type_other,
      updatesOptIn: row.updates_opt_in === 1,
      createdAt: row.created_at,
    }))
    return json({ ok: true, participant: { email: session.email, displayName: session.display_name || '' }, registrations })
  } catch (error) {
    console.error(JSON.stringify({ event: 'participant_registrations_failed', reason: error instanceof Error ? error.message : 'unknown' }))
    return json({ ok: false, error: 'We could not load your registrations. Please try again.' }, 500)
  }
}

