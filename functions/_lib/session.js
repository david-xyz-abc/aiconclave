import { parseCookies } from './http.js'

export const SESSION_COOKIE = '__Host-aic_session'
export const NONCE_COOKIE = '__Host-aic_google_nonce'
const SESSION_SECONDS = 60 * 60 * 24 * 14
const NONCE_SECONDS = 60 * 5

function base64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function constantTimeEqual(left, right) {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(left)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(right)),
  ])
  const leftBytes = new Uint8Array(leftDigest)
  const rightBytes = new Uint8Array(rightDigest)
  if (typeof crypto.subtle.timingSafeEqual === 'function') return crypto.subtle.timingSafeEqual(leftBytes, rightBytes)
  let difference = 0
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index]
  return difference === 0
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
}

export function issueNonce() {
  const nonce = randomToken()
  return { nonce, cookie: cookie(NONCE_COOKIE, nonce, NONCE_SECONDS) }
}

export function clearNonceCookie() {
  return cookie(NONCE_COOKIE, '', 0)
}

export function clearSessionCookie() {
  return cookie(SESSION_COOKIE, '', 0)
}

export function nonceFromRequest(request) {
  return parseCookies(request).get(NONCE_COOKIE) || ''
}

export async function createSession(db, participantAccountId) {
  const token = randomToken()
  const tokenHash = await sha256Hex(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString()
  await db.prepare(`INSERT INTO participant_sessions (token_hash, participant_account_id, created_at, expires_at) VALUES (?, ?, ?, ?)`).bind(tokenHash, participantAccountId, now.toISOString(), expiresAt).run()
  return { cookie: cookie(SESSION_COOKIE, token, SESSION_SECONDS), expiresAt }
}

export async function getParticipantSession(request, db) {
  const token = parseCookies(request).get(SESSION_COOKIE)
  if (!token || token.length > 128) return null
  const tokenHash = await sha256Hex(token)
  return db.prepare(`SELECT a.id, a.google_sub, a.email, a.display_name, s.expires_at FROM participant_sessions s JOIN participant_accounts a ON a.id = s.participant_account_id WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1`).bind(tokenHash, new Date().toISOString()).first()
}

export async function deleteSession(request, db) {
  const token = parseCookies(request).get(SESSION_COOKIE)
  if (!token || token.length > 128) return
  await db.prepare('DELETE FROM participant_sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run()
}

