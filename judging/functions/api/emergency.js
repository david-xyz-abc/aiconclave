import { requireVenueAdmin, json } from "../_shared/auth.js";
import { isSameOrigin, readJsonBody } from "../../../functions/_shared/auth.js";
import { writeGuard, historyStatement } from "../_shared/evaluations.js";
import { decodeEvaluation } from "../../shared/evaluation.js";
const fail = (error, status = 400) => json({ ok: false, error }, status);
export async function onRequestGet(context) {
  const auth = await requireVenueAdmin(context);
  if (auth.response) return auth.response;
  try {
    const db = context.env.DB;
    const teamId = new URL(context.request.url).searchParams.get("teamId");
    if (teamId) {
      const result = await db
        .prepare(
          "SELECT * FROM judging_evaluation_history WHERE team_id=? ORDER BY created_at DESC,id DESC",
        )
        .bind(Number(teamId))
        .all();
      return json({
        ok: true,
        history: result.results.map((h) => ({
          ...h,
          previous_snapshot: h.previous_snapshot
            ? JSON.parse(h.previous_snapshot)
            : null,
          next_snapshot: JSON.parse(h.next_snapshot),
        })),
      });
    }
    const results = await db.batch([
      db.prepare("SELECT revision FROM judging_state WHERE id=1"),
      db.prepare(
        "SELECT e.*, j.name AS judge_name FROM judging_evaluations e JOIN judging_judges j ON j.id=e.judge_id ORDER BY e.updated_at DESC,e.team_id",
      ),
    ]);
    return json({
      ok: true,
      revision: results[0].results[0].revision,
      evaluations: results[1].results.map(decodeEvaluation),
    });
  } catch {
    return fail("Could not load evaluations. Try again.", 500);
  }
}
export async function onRequestPost(context) {
  const auth = await requireVenueAdmin(context);
  if (auth.response) return auth.response;
  if (!isSameOrigin(context.request))
    return fail("Request origin could not be verified.", 403);
  let body;
  try {
    body = await readJsonBody(context.request);
  } catch {
    return fail("Invalid request.");
  }
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (
    !Number.isSafeInteger(body?.teamId) ||
    !Number.isSafeInteger(body?.revision) ||
    !Number.isSafeInteger(body?.evaluationRevision) ||
    reason.length < 5 ||
    reason.length > 1000
  )
    return fail(
      "Provide a reason (5–1000 characters) for reopening this evaluation.",
    );
  try {
    const db = context.env.DB;
    const previous = decodeEvaluation(
      await db
        .prepare("SELECT * FROM judging_evaluations WHERE team_id=?")
        .bind(body.teamId)
        .first(),
    );
    if (
      !previous ||
      previous.status !== "submitted" ||
      previous.revision !== body.evaluationRevision
    )
      return fail(
        "This evaluation has changed or is already open. Refresh first.",
        409,
      );
    const next = {
      ...previous,
      status: "draft",
      revision: previous.revision + 1,
      submitted_at: null,
      updated_at: new Date().toISOString(),
    };
    await db.batch([
      writeGuard(
        db,
        body.revision,
        auth.session.username,
        "evaluation_reopen",
        { teamId: body.teamId, reason },
      ),
      db
        .prepare(
          "UPDATE judging_evaluations SET status='draft',revision=?,submitted_at=NULL,updated_at=? WHERE team_id=?",
        )
        .bind(next.revision, next.updated_at, body.teamId),
      historyStatement(
        db,
        auth.session.username,
        "reopen",
        previous,
        next,
        reason,
      ),
    ]);
    return json({ ok: true });
  } catch (e) {
    return fail(
      /judging_stale_revision/.test(e.message)
        ? "The workspace changed. Refresh before reopening."
        : "Could not reopen this evaluation. Try again.",
      /judging_stale_revision/.test(e.message) ? 409 : 500,
    );
  }
}
