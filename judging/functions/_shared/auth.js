import { parseCookies, sha256 } from "../../../functions/_shared/auth.js";
export const COOKIE = "__Host-aiconclave_judging_session";
export const sessionCookie = (token, maxAge = 43200) =>
  `${COOKIE}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
export async function getSession(context) {
  const token = parseCookies(context.request)[COOKIE];
  if (!token) return null;
  return context.env.DB.prepare(
    `SELECT u.id, u.username, u.role, u.judge_id FROM judging_sessions s JOIN judging_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now')`,
  )
    .bind(await sha256(token))
    .first();
}
export async function requireVenueAdmin(context) {
  const session = await getSession(context);
  if (!session)
    return {
      response: json(
        { ok: false, error: "Sign in to judging operations." },
        401,
      ),
    };
  if (session.role !== "venue_admin")
    return {
      response: json({ ok: false, error: "Venue team access required." }, 403),
    };
  return { session };
}

export async function requireJudge(context) {
  const session = await getSession(context);
  if (!session)
    return {
      response: json({ ok: false, error: "Judge sign-in required." }, 401),
    };
  if (session.role !== "judge" || !session.judge_id)
    return {
      response: json({ ok: false, error: "Judge access required." }, 403),
    };
  return { session };
}
