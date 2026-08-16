import { json } from '../../_lib/http.js'
import { getParticipantSession } from '../../_lib/session.js'

export async function onRequestGet(context) {
  const db = context.env?.DB
  if (!db) return json({ ok: false, error: 'Sign-in service is unavailable.' }, 503)
  try {
    const session = await getParticipantSession(context.request, db)
    if (!session) return json({ ok: true, signedIn: false })
    return json({ ok: true, signedIn: true, participant: { email: session.email, displayName: session.display_name || '' } })
  } catch (error) {
    console.error(JSON.stringify({ event: 'session_lookup_failed', reason: error instanceof Error ? error.message : 'unknown' }))
    return json({ ok: false, error: 'We could not check your sign-in status.' }, 500)
  }
}

