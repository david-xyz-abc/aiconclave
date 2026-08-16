import { issueNonce } from '../../_lib/session.js'
import { json } from '../../_lib/http.js'

export function onRequestGet(context) {
  const clientId = context.env?.GOOGLE_CLIENT_ID
  if (typeof clientId !== 'string' || !clientId.endsWith('.apps.googleusercontent.com')) {
    return json({ ok: false, error: 'Google Sign-In is not configured yet.' }, 503)
  }
  const issued = issueNonce()
  return json({ ok: true, clientId, nonce: issued.nonce }, 200, { 'set-cookie': issued.cookie })
}

