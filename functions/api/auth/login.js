import {
  constantTimeEqual,
  hashPassword,
  isSameOrigin,
  newToken,
  readJsonBody,
  sessionCookie,
  sha256,
  SESSION_TTL_SECONDS,
} from "../../_shared/auth.js";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export async function onRequestPost(context) {
  if (!isSameOrigin(context.request))
    return json(
      { ok: false, error: "This sign-in request could not be verified." },
      403,
    );
  let body;
  try {
    body = await readJsonBody(context.request);
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }
  const username =
    typeof body?.username === "string" ? body.username.trim().slice(0, 80) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password)
    return json(
      { ok: false, error: "Username and password are required." },
      400,
    );

  const user = await context.env.DB.prepare(
    "SELECT id, username, password_hash, password_salt, password_iterations FROM admin_users WHERE username = ?",
  )
    .bind(username)
    .first();
  if (!user)
    return json({ ok: false, error: "Invalid username or password." }, 401);

  let passwordHash;
  try {
    passwordHash = await hashPassword(
      password,
      user.password_salt,
      user.password_iterations,
    );
  } catch {
    return json({ ok: false, error: "Invalid username or password." }, 401);
  }
  if (!(await constantTimeEqual(passwordHash, user.password_hash)))
    return json({ ok: false, error: "Invalid username or password." }, 401);

  const token = newToken();
  const tokenHash = await sha256(token);
  await context.env.DB.prepare(
    `INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at)
     VALUES (?, ?, datetime('now', '+12 hours'))`,
  )
    .bind(user.id, tokenHash)
    .run();
  await context.env.DB.prepare(
    "DELETE FROM admin_sessions WHERE expires_at <= datetime('now')",
  ).run();

  return json({ ok: true, user: { username: user.username } }, 200, {
    "set-cookie": sessionCookie(token, SESSION_TTL_SECONDS),
  });
}
