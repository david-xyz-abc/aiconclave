const JSON_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
}

export function json(data, status = 200, extraHeaders, cookies = []) {
  const headers = new Headers(JSON_HEADERS)
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => headers.append(key, value))
  }
  for (const value of cookies) headers.append('set-cookie', value)
  return new Response(JSON.stringify(data), { status, headers })
}

export function parseCookies(request) {
  const cookies = new Map()
  const header = request.headers.get('cookie') || ''
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 1) continue
    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    try {
      cookies.set(name, decodeURIComponent(value))
    } catch {
      cookies.set(name, value)
    }
  }
  return cookies
}

export function isSameOrigin(request) {
  const origin = request.headers.get('origin')
  return Boolean(origin) && origin === new URL(request.url).origin
}

export async function readJsonBody(request, maximumBytes = 16_384) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('application/json')) throw new Error('unsupported-content-type')

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) throw new Error('body-too-large')
  if (!request.body) return {}

  const reader = request.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maximumBytes) {
      await reader.cancel()
      throw new Error('body-too-large')
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
