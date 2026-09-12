import {
  constantTimeEqual,
  hashPassword,
  isSameOrigin,
  newToken,
  parseCookies,
  readJsonBody,
  sha256,
} from "../../../functions/_shared/auth.js";
import { COOKIE, sessionCookie, json, getSession } from "../_shared/auth.js";
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "GET") {
    const user = await getSession(context);
    return user
      ? json({ ok: true, user: { username: user.username, role: user.role } })
      : json({ ok: false }, 401);
  }
  if (!["POST", "DELETE"].includes(request.method))
    return json({ ok: false, error: "Method not allowed." }, 405, {
      allow: "GET, POST, DELETE",
    });
  if (!isSameOrigin(request))
    return json(
      { ok: false, error: "Request origin could not be verified." },
      403,
    );
  if (request.method === "DELETE") {
    const token = parseCookies(request)[COOKIE];
    if (token)
      await env.DB.prepare("DELETE FROM judging_sessions WHERE token_hash=?")
        .bind(await sha256(token))
        .run();
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  }
  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }
  const username =
    typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || username.length > 80 || !password || password.length > 1024)
    return json({ ok: false, error: "Enter your username and password." }, 400);
  const role = body.role === "judge" ? "judge" : "venue_admin";
  const user = await env.DB.prepare(
    "SELECT * FROM judging_users WHERE username=? AND role=? AND (role='venue_admin' OR judge_id IS NOT NULL)",
  )
    .bind(username, role)
    .first();
  const invalid = () =>
    json({ ok: false, error: "Invalid username or password." }, 401);
  if (!user) return invalid();
  if (user.locked_until > Math.floor(Date.now() / 1000))
    return json(
      {
        ok: false,
        error: "Too many sign-in attempts. Try again in 15 minutes.",
      },
      429,
    );
  const digest = await hashPassword(
    password,
    user.password_salt,
    user.password_iterations,
  );
  if (!(await constantTimeEqual(digest, user.password_hash))) {
    await env.DB.prepare(
      `UPDATE judging_users SET failed_attempts=CASE WHEN locked_until>0 AND locked_until<=unixepoch() THEN 1 ELSE failed_attempts+1 END,
   locked_until=CASE WHEN locked_until>0 AND locked_until<=unixepoch() THEN 0 WHEN failed_attempts>=4 THEN unixepoch()+900 ELSE 0 END WHERE id=? AND locked_until<=unixepoch()`,
    )
      .bind(user.id)
      .run();
    return invalid();
  }
  const token = newToken();
  const result = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO judging_sessions(token_hash,user_id,expires_at) SELECT ?,id,datetime('now','+12 hours') FROM judging_users WHERE id=? AND locked_until<=unixepoch()`,
    ).bind(await sha256(token), user.id),
    env.DB.prepare(
      "UPDATE judging_users SET failed_attempts=0,locked_until=0 WHERE id=? AND locked_until<=unixepoch()",
    ).bind(user.id),
    env.DB.prepare(
      "DELETE FROM judging_sessions WHERE expires_at<=datetime('now')",
    ),
  ]);
  if (!result[0].meta.changes)
    return json(
      {
        ok: false,
        error: "Too many sign-in attempts. Try again in 15 minutes.",
      },
      429,
    );
  return json(
    { ok: true, user: { username: user.username, role: user.role } },
    200,
    { "set-cookie": sessionCookie(token) },
  );
}
