import { enforceApiRateLimit } from './_lib/rateLimit.js'

export async function onRequest(context) {
  const isApiRequest = new URL(context.request.url).pathname.startsWith('/api/')
  let rateLimitHeaders
  if (isApiRequest) {
    const rateLimitResult = await enforceApiRateLimit(context)
    if (rateLimitResult instanceof Response) return withSecurityHeaders(rateLimitResult)
    rateLimitHeaders = rateLimitResult?.headers
  }

  const response = await context.next()
  return withSecurityHeaders(response, rateLimitHeaders)
}

function withSecurityHeaders(response, rateLimitHeaders) {
  const headers = new Headers(response.headers)
  if (rateLimitHeaders) {
    for (const [name, value] of Object.entries(rateLimitHeaders)) {
      if (!headers.has(name)) headers.set(name, value)
    }
  }
  headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com/gsi/client",
    "style-src 'self' https://accounts.google.com/gsi/style",
    "img-src 'self' data:",
    "connect-src 'self' https://accounts.google.com/gsi/",
    "frame-src https://accounts.google.com/gsi/ https://accounts.google.com/",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '))
  headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  headers.set('Cross-Origin-Resource-Policy', 'same-site')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
