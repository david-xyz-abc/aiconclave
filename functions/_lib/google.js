import { constantTimeEqual } from './session.js'

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])
const MAX_JWKS_BYTES = 131_072

function decodeBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid-token-encoding')
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + padding)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function decodeJsonPart(value) {
  const decoded = new TextDecoder().decode(decodeBase64Url(value))
  const parsed = JSON.parse(decoded)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid-token-json')
  return parsed
}

async function fetchGoogleKeys(bypassCache = false) {
  const request = new Request(GOOGLE_JWKS_URL, { headers: { accept: 'application/json' } })
  const cache = typeof caches === 'undefined' ? null : caches.default
  if (cache && !bypassCache) {
    const cached = await cache.match(request)
    if (cached) return readBoundedJson(cached)
  }

  const response = await fetch(request)
  if (!response.ok) throw new Error('google-keys-unavailable')
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_JWKS_BYTES) throw new Error('google-keys-too-large')
  if (cache) await cache.put(request, response.clone())
  return readBoundedJson(response)
}

async function readBoundedJson(response) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('google-keys-unavailable')
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_JWKS_BYTES) {
      await reader.cancel()
      throw new Error('google-keys-too-large')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(bytes))
}

async function findSigningKey(keyId) {
  let keySet = await fetchGoogleKeys(false)
  let key = Array.isArray(keySet?.keys) ? keySet.keys.find((candidate) => candidate.kid === keyId && candidate.kty === 'RSA') : null
  if (!key) {
    keySet = await fetchGoogleKeys(true)
    key = Array.isArray(keySet?.keys) ? keySet.keys.find((candidate) => candidate.kid === keyId && candidate.kty === 'RSA') : null
  }
  if (!key) throw new Error('google-signing-key-not-found')
  return key
}

export async function verifyGoogleCredential(credential, expectedAudience, expectedNonce) {
  if (typeof credential !== 'string' || credential.length < 100 || credential.length > 12_000) throw new Error('invalid-google-token')
  if (typeof expectedAudience !== 'string' || !expectedAudience.endsWith('.apps.googleusercontent.com')) throw new Error('invalid-google-client')
  if (typeof expectedNonce !== 'string' || expectedNonce.length < 32 || expectedNonce.length > 128) throw new Error('invalid-google-nonce')

  const parts = credential.split('.')
  if (parts.length !== 3) throw new Error('invalid-google-token')
  const header = decodeJsonPart(parts[0])
  const payload = decodeJsonPart(parts[1])
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 200) throw new Error('invalid-google-header')

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    await findSigningKey(header.kid),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const validSignature = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  )
  if (!validSignature) throw new Error('invalid-google-signature')

  const now = Math.floor(Date.now() / 1000)
  if (payload.aud !== expectedAudience) throw new Error('invalid-google-audience')
  if (!GOOGLE_ISSUERS.has(payload.iss)) throw new Error('invalid-google-issuer')
  if (!Number.isFinite(payload.exp) || payload.exp <= now) throw new Error('expired-google-token')
  if (!Number.isFinite(payload.iat) || payload.iat > now + 300) throw new Error('invalid-google-issued-at')
  if (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || payload.nbf > now + 300)) throw new Error('invalid-google-not-before')
  if (typeof payload.nonce !== 'string' || !(await constantTimeEqual(payload.nonce, expectedNonce))) throw new Error('invalid-google-nonce')
  if (typeof payload.sub !== 'string' || payload.sub.length < 1 || payload.sub.length > 255) throw new Error('invalid-google-subject')
  if (payload.email_verified !== true || typeof payload.email !== 'string' || payload.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new Error('unverified-google-email')

  const email = payload.email.trim().toLowerCase()
  const hostedDomain = typeof payload.hd === 'string' ? payload.hd.trim().toLowerCase() : ''
  const googleAuthoritative = email.endsWith('@gmail.com') || email.endsWith('@googlemail.com') || Boolean(hostedDomain)
  if (!googleAuthoritative) throw new Error('non-authoritative-google-email')

  return {
    googleSub: payload.sub,
    email,
    displayName: typeof payload.name === 'string' ? payload.name.trim().slice(0, 120) : '',
  }
}

