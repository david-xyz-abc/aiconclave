import { verifyGoogleCredential } from '../../_lib/google.js'
import { isSameOrigin, json, readJsonBody } from '../../_lib/http.js'
import { clearNonceCookie, createSession, nonceFromRequest } from '../../_lib/session.js'

export async function onRequestPost(context) {
  const db = context.env?.DB
  const clientId = context.env?.GOOGLE_CLIENT_ID
  if (!db || typeof clientId !== 'string') return json({ ok: false, error: 'Google Sign-In is not configured yet.' }, 503)
  if (!isSameOrigin(context.request)) return json({ ok: false, error: 'This sign-in request could not be verified.' }, 403)

  let body
  try {
    body = await readJsonBody(context.request)
  } catch {
    return json({ ok: false, error: 'The sign-in response was invalid. Please try again.' }, 400)
  }

  const nonce = nonceFromRequest(context.request)
  let identity
  try {
    identity = await verifyGoogleCredential(body?.credential, clientId, nonce)
  } catch (error) {
    console.error(JSON.stringify({ event: 'google_sign_in_rejected', reason: error instanceof Error ? error.message : 'unknown' }))
    return json({ ok: false, error: 'Google Sign-In could not be verified. Please try again.' }, 401, { 'set-cookie': clearNonceCookie() })
  }

  try {
    let account = await db.prepare('SELECT id, google_sub, email, display_name FROM participant_accounts WHERE google_sub = ? LIMIT 1').bind(identity.googleSub).first()
    let previousEmail = ''
    if (!account) {
      const emailOwner = await db.prepare('SELECT id, google_sub FROM participant_accounts WHERE email = ? COLLATE NOCASE LIMIT 1').bind(identity.email).first()
      if (emailOwner) return json({ ok: false, error: 'This registration email is already connected to another Google account. Please contact the organisers.' }, 409)
      const inserted = await db.prepare('INSERT INTO participant_accounts (google_sub, email, display_name) VALUES (?, ?, ?)').bind(identity.googleSub, identity.email, identity.displayName).run()
      account = { id: inserted.meta.last_row_id, google_sub: identity.googleSub, email: identity.email, display_name: identity.displayName }
    } else {
      previousEmail = account.email
      if (account.email.toLowerCase() !== identity.email) {
        const emailOwner = await db.prepare('SELECT id FROM participant_accounts WHERE email = ? COLLATE NOCASE AND id != ? LIMIT 1').bind(identity.email, account.id).first()
        if (emailOwner) return json({ ok: false, error: 'This registration email is already connected to another Google account. Please contact the organisers.' }, 409)
      }
      await db.prepare(`UPDATE participant_accounts SET email = ?, display_name = ?, last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`).bind(identity.email, identity.displayName, account.id).run()
      account = { ...account, email: identity.email, display_name: identity.displayName }
    }

    await db.prepare('UPDATE panel_registrations SET participant_account_id = ? WHERE participant_account_id IS NULL AND email = ? COLLATE NOCASE').bind(account.id, account.email).run()
    if (previousEmail && previousEmail.toLowerCase() !== account.email.toLowerCase()) {
      await db.prepare('UPDATE panel_registrations SET participant_account_id = ? WHERE participant_account_id IS NULL AND email = ? COLLATE NOCASE').bind(account.id, previousEmail).run()
    }
    const session = await createSession(db, account.id)
    return json(
      { ok: true, participant: { email: account.email, displayName: identity.displayName || account.display_name || '' } },
      200,
      undefined,
      [session.cookie, clearNonceCookie()],
    )
  } catch (error) {
    console.error(JSON.stringify({ event: 'google_sign_in_failed', reason: error instanceof Error ? error.message : 'unknown' }))
    return json({ ok: false, error: 'We could not complete sign-in. Please try again.' }, 500, { 'set-cookie': clearNonceCookie() })
  }
}
