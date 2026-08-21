export class ApiError extends Error {
  constructor(message, status = 500, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      accept: 'application/json',
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) {
    throw new ApiError(data.error || 'The request could not be completed.', response.status, data)
  }
  return data
}

export const authApi = {
  config: () => requestJson('/api/auth/config'),
  session: () => requestJson('/api/auth/session'),
  google: (credential) => requestJson('/api/auth/google', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ credential }),
  }),
  logout: () => requestJson('/api/auth/logout', { method: 'POST' }),
}

export const registrationApi = {
  listMine: () => requestJson('/api/my-registration'),
  submit: (registrationType, form) => requestJson('/api/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...form, registrationType }),
  }),
}
