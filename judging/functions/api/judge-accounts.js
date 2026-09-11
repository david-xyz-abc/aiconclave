import { requireVenueAdmin, json } from "../_shared/auth.js";
import {
  isSameOrigin,
  readJsonBody,
  hashPassword,
  newToken,
} from "../../../functions/_shared/auth.js";
import { writeGuard } from "../_shared/evaluations.js";
export async function onRequestPost(context) {
  const auth = await requireVenueAdmin(context);
  if (auth.response) return auth.response;
  const fail = (error, status = 400) => json({ ok: false, error }, status);
  if (!isSameOrigin(context.request))
    return fail("Request origin could not be verified.", 403);
  let body;
  try {
    body = await readJsonBody(context.request);
  } catch {
    return fail("Invalid request.");
  }
  if (
    typeof body?.judgeId !== "string" ||
    !Number.isSafeInteger(body.revision) ||
    !/^[a-zA-Z0-9._-]{3,60}$/.test(body.username || "") ||
    typeof body.password !== "string" ||
    body.password.length < 8 ||
    body.password.length > 128
  )
    return fail(
      "Use a 3–60 character login ID (letters, numbers, dots, underscores or hyphens) and a password of 8–128 characters.",
    );
  try {
    const db = context.env.DB;
    if (
      !(await db
        .prepare("SELECT id FROM judging_judges WHERE id=?")
        .bind(body.judgeId)
        .first())
    )
      return fail("Judge not found.", 404);
    const salt = newToken(),
      hash = await hashPassword(body.password, salt, 100000);
    await db.batch([
      writeGuard(db, body.revision, auth.session.username, "judge_account", {
        judgeId: body.judgeId,
        username: body.username,
      }),
      db
        .prepare(
          "DELETE FROM judging_sessions WHERE user_id IN (SELECT id FROM judging_users WHERE judge_id=?)",
        )
        .bind(body.judgeId),
      db
        .prepare(
          `INSERT INTO judging_users(id,username,password_hash,password_salt,password_iterations,role,judge_id) VALUES(?,?,?,?,100000,'judge',?)
 ON CONFLICT(judge_id) WHERE judge_id IS NOT NULL DO UPDATE SET username=excluded.username,password_hash=excluded.password_hash,password_salt=excluded.password_salt,failed_attempts=0,locked_until=0`,
        )
        .bind(crypto.randomUUID(), body.username, hash, salt, body.judgeId),
    ]);
    return json({ ok: true });
  } catch (e) {
    return fail(
      /UNIQUE constraint/.test(e.message)
        ? "That login ID is already in use. Choose another."
        : /judging_stale_revision/.test(e.message)
          ? "The workspace changed. Refresh before saving credentials."
          : "Could not save judge credentials. Try again.",
      /UNIQUE constraint|judging_stale_revision/.test(e.message) ? 409 : 500,
    );
  }
}
