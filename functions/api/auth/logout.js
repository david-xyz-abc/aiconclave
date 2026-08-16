import { isSameOrigin, json } from '../../_lib/http.js'
import { clearSessionCookie, deleteSession } from '../../_lib/session.js'

export async function onRequestPost(context) {
  const db = context.env?.DB
  if (!db) return json({ ok: false, error: 'Sign-in service is unavailable.' }, 503)
  if (!isSameOrigin(context.request)) return json({ ok: false, error: 'This logout request could not be verified.' }, 403)
  try {
    await deleteSession(context.request, db)
  } catch (error) {
    console.error(JSON.stringify({ event: 'logout_cleanup_failed', reason: error instanceof Error ? error.message : 'unknown' }))
  }
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() })
}

