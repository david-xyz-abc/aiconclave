import { json } from '../_lib/http.js'
import { getParticipantSession } from '../_lib/session.js'

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function onRequestGet(context) {
  const db = context.env?.DB
  if (!db) return json({ ok: false, error: 'Registration service is unavailable.' }, 503)
  try {
    const session = await getParticipantSession(context.request, db)
    if (!session) return json({ ok: false, error: 'Sign in to view your registrations.' }, 401)
    const tableResult = await db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('panel_registrations', 'hackathon_registrations', 'hackathon_teams', 'hackathon_team_members', 'hackathon_member_claims')`).all()
    const availableTables = new Set((tableResult.results || []).map((row) => row.name))
    const sourceFailures = []
    const loadSource = async (source, loader) => {
      try {
        return await loader()
      } catch (error) {
        sourceFailures.push(source)
        console.error(JSON.stringify({ event: 'participant_registration_source_failed', source, reason: error instanceof Error ? error.message : 'unknown' }))
        return { results: [] }
      }
    }

    const panelResult = availableTables.has('panel_registrations')
      ? await loadSource('panel', () => db.prepare(`SELECT id, name, email, phone, participant_type, organisation, department, panel_selection, industry_sector, industry_sector_other, organisation_type, organisation_type_other, updates_opt_in, created_at FROM panel_registrations WHERE email = ? COLLATE NOCASE ORDER BY created_at DESC`).bind(session.email).all())
      : { results: [] }
    const legacyHackathonResult = availableTables.has('hackathon_registrations')
      ? await loadSource('legacy_hackathon', () => db.prepare(`SELECT id, name, email, phone, participant_type, organisation, tracks, challenge_area, subcategory, problem_area, idea_summary, created_at FROM hackathon_registrations WHERE email = ? COLLATE NOCASE ORDER BY created_at DESC`).bind(session.email).all())
      : { results: [] }
    const teamTablesAvailable = ['hackathon_teams', 'hackathon_team_members', 'hackathon_member_claims'].every((table) => availableTables.has(table))
    const teamResult = teamTablesAvailable
      ? await loadSource('hackathon_team', () => db.prepare(`SELECT DISTINCT t.id, t.team_code, t.team_name, t.participant_category, t.team_size, t.sector_track, t.solution_type, t.submitted_at, t.created_at FROM hackathon_teams t LEFT JOIN hackathon_member_claims c ON c.team_id = t.id WHERE t.captain_account_id = ? OR c.email_key = ? COLLATE NOCASE ORDER BY COALESCE(t.submitted_at, t.created_at) DESC`).bind(session.id, session.email.toLowerCase()).all())
      : { results: [] }
    const panelRegistrations = (panelResult.results || []).map((row) => ({
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
    const legacyHackathonRegistrations = (legacyHackathonResult.results || []).map((row) => ({
      id: row.id,
      type: 'Hackathon',
      status: 'Received',
      name: row.name,
      email: row.email,
      phone: row.phone,
      participantType: row.participant_type,
      organisation: row.organisation,
      tracks: safeJsonArray(row.tracks),
      challengeArea: row.challenge_area,
      subcategory: row.subcategory,
      problemArea: row.problem_area,
      ideaSummary: row.idea_summary,
      createdAt: row.created_at,
    }))

    const teamRows = teamResult.results || []
    let memberRows = []
    if (teamRows.length) {
      const placeholders = teamRows.map(() => '?').join(', ')
      const memberResult = await loadSource('hackathon_team_members', () => db.prepare(`SELECT team_id, member_order, role, full_name, email, phone, institution, department_or_course, year_or_grade FROM hackathon_team_members WHERE team_id IN (${placeholders}) ORDER BY team_id, member_order`).bind(...teamRows.map((row) => row.id)).all())
      memberRows = memberResult.results || []
    }
    const membersByTeam = new Map()
    for (const row of memberRows) {
      if (!membersByTeam.has(row.team_id)) membersByTeam.set(row.team_id, [])
      membersByTeam.get(row.team_id).push({
        memberOrder: row.member_order,
        role: row.role,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        institution: row.institution,
        departmentOrCourse: row.department_or_course,
        yearOrGrade: row.year_or_grade,
      })
    }
    const teamRegistrations = teamRows.map((row) => ({
      id: row.id,
      type: 'Hackathon Team',
      status: row.submitted_at ? 'Received' : 'Draft',
      teamCode: row.team_code,
      teamName: row.team_name,
      participantCategory: row.participant_category,
      teamSize: row.team_size,
      sectorTrack: row.sector_track,
      solutionType: row.solution_type,
      members: membersByTeam.get(row.id) || [],
      createdAt: row.submitted_at || row.created_at,
    }))
    const registrations = [...panelRegistrations, ...teamRegistrations, ...legacyHackathonRegistrations].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (sourceFailures.length > 0 && registrations.length === 0) {
      return json({
        ok: false,
        error: 'Your registration records could not be checked completely. Please try again.',
        failedSources: sourceFailures,
      }, 503)
    }
    return json({
      ok: true,
      participant: { email: session.email, displayName: session.display_name || '' },
      registrations,
      partial: sourceFailures.length > 0,
      failedSources: sourceFailures,
    })
  } catch (error) {
    console.error(JSON.stringify({ event: 'participant_registrations_failed', reason: error instanceof Error ? error.message : 'unknown' }))
    return json({ ok: false, error: 'We could not load your registrations. Please try again.' }, 500)
  }
}
