import { json } from './http.js'

const API_POLICIES = [
  // The IP layer is intentionally generous because many attendees may share
  // one college/campus NAT address. Registration also has a stricter account
  // limiter below, so shared Wi-Fi does not become an availability problem.
  { method: 'POST', path: '/api/auth/google', limit: 300, windowSeconds: 60 },
  { method: 'POST', path: '/api/register', limit: 600, windowSeconds: 60 },
  { method: 'POST', path: '/api/auth/logout', limit: 300, windowSeconds: 60 },
  { method: 'GET', path: '/api/my-registration', limit: 600, windowSeconds: 60 },
  { method: 'GET', path: '/api/auth/session', limit: 1_200, windowSeconds: 60 },
  { method: 'GET', path: '/api/auth/config', limit: 600, windowSeconds: 60 },
]

const FALLBACK_POLICY = { limit: 300, windowSeconds: 60 }

function getPolicy(request) {
  const { pathname } = new URL(request.url)
  return API_POLICIES.find((policy) => policy.method === request.method && policy.path === pathname) || FALLBACK_POLICY
}

function getClientAddress(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'local-client'
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function normalizedRouteKey(request, scope) {
  if (scope) return scope.slice(0, 120)
  const { pathname } = new URL(request.url)
  return `${request.method} ${pathname}`.slice(0, 120)
}

function rateHeaders(limit, remaining, resetSeconds) {
  return {
    'ratelimit-limit': String(limit),
    'ratelimit-remaining': String(Math.max(0, remaining)),
    'ratelimit-reset': String(resetSeconds),
  }
}

export async function consumeRateLimit({ db, request, identity, scope, limit, windowSeconds }) {
  const routeKey = normalizedRouteKey(request, scope)
  const nowSeconds = Math.floor(Date.now() / 1000)
  const windowStartSeconds = Math.floor(nowSeconds / windowSeconds) * windowSeconds
  const resetSeconds = Math.max(1, windowStartSeconds + windowSeconds - nowSeconds)
  const subject = identity || getClientAddress(request)
  const bucketKey = await sha256Hex(`${routeKey}\n${windowStartSeconds}\n${subject}`)
  const startedAt = new Date(windowStartSeconds * 1000).toISOString()
  const expiresAt = new Date((windowStartSeconds + windowSeconds + 300) * 1000).toISOString()

  const row = await db.prepare(`
    INSERT INTO api_rate_limits (
      bucket_key, route_key, request_count, window_started_at, expires_at
    ) VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(bucket_key) DO UPDATE SET
      request_count = api_rate_limits.request_count + 1
    RETURNING request_count
  `).bind(bucketKey, routeKey, startedAt, expiresAt).first()

  const count = Number(row?.request_count || 1)
  return {
    allowed: count <= limit,
    count,
    cleanupSuggested: bucketKey.startsWith('00'),
    headers: rateHeaders(limit, limit - count, resetSeconds),
    retryAfter: resetSeconds,
  }
}

export async function enforceApiRateLimit(context) {
  if (context.request.method === 'OPTIONS') return null
  const db = context.env?.DB
  if (!db) return json({ ok: false, error: 'This service is temporarily unavailable.' }, 503)

  const policy = getPolicy(context.request)
  try {
    const result = await consumeRateLimit({ db, request: context.request, ...policy })
    if (result.cleanupSuggested) {
      context.waitUntil(
        db.prepare(`DELETE FROM api_rate_limits WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`).run()
          .catch(() => undefined),
      )
    }
    if (result.allowed) return { headers: result.headers }
    return json(
      { ok: false, error: 'Too many requests. Please wait a moment and try again.' },
      429,
      { ...result.headers, 'retry-after': String(result.retryAfter) },
    )
  } catch (error) {
    console.error(JSON.stringify({ event: 'api_rate_limit_failed', reason: error instanceof Error ? error.message : 'unknown' }))
    return json({ ok: false, error: 'This service is temporarily unavailable.' }, 503)
  }
}

export async function enforceParticipantRegistrationLimit(context, participantId) {
  const result = await consumeRateLimit({
    db: context.env.DB,
    request: context.request,
    identity: `participant:${participantId}`,
    scope: 'POST /api/register participant',
    limit: 20,
    windowSeconds: 3600,
  })
  if (result.allowed) return null
  return json(
    { ok: false, error: 'Too many registration attempts. Please review your details and try again later.' },
    429,
    { ...result.headers, 'retry-after': String(result.retryAfter) },
  )
}
