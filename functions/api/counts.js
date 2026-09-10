export const COUNTS_SQL = `
  SELECT COUNT(*) AS present,
    COALESCE(SUM(a.meal_preference = 'Veg'), 0) AS veg,
    COALESCE(SUM(a.meal_preference = 'Non-Veg'), 0) AS nonVeg,
    COALESCE(SUM(a.meal_preference IS NULL OR a.meal_preference NOT IN ('Veg', 'Non-Veg')), 0) AS unrecorded
  FROM hackathon_team_members m
  JOIN hackathon_teams t ON t.id = m.team_id AND t.submitted_at IS NOT NULL
  JOIN hackathon_attendance a ON a.id = (
    SELECT aa.id FROM hackathon_attendance aa
    WHERE aa.member_id = m.id AND aa.team_id = m.team_id
    ORDER BY aa.attendance_date DESC, aa.marked_at DESC, aa.id DESC LIMIT 1
  )
  WHERE a.present = 1`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  } });
}

export async function passwordMatches(password, user) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(user.password_salt), iterations: user.password_iterations, hash: 'SHA-256' }, key, 256);
  const actual = Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
  const expected = user.password_hash;
  if (typeof expected !== 'string' || expected.length !== actual.length) return false;
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

export async function onRequest({ request, env }) {
  // No mutation routes or session writes exist in this project.
  if (request.method !== 'GET') return json({ error: 'Read-only endpoint.' }, 405);
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Request denied.' }, 403);
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ') || header.length > 2048) return json({ error: 'Sign in to view meal counts.' }, 401);
  let username, password;
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(header.slice(6)), char => char.charCodeAt(0)));
    const separator = decoded.indexOf(':');
    if (separator < 1) throw new Error('Invalid credentials');
    username = decoded.slice(0, separator);
    password = decoded.slice(separator + 1);
  } catch { return json({ error: 'Invalid username or password.' }, 401); }
  try {
    // Reuse the existing viewer account without granting any new permissions.
    const user = await env.DB.prepare(`SELECT password_hash, password_salt, password_iterations
      FROM admin_users WHERE username = ? AND username = 'user1' AND attendance_access = 'read'`).bind(username).first();
    if (!user || !await passwordMatches(password, user)) return json({ error: 'Invalid username or password.' }, 401);
    const counts = await env.DB.prepare(COUNTS_SQL).first();
    return json({ counts, updatedAt: new Date().toISOString() });
  } catch { return json({ error: 'Meal counts are unavailable. Please retry.' }, 503); }
}
