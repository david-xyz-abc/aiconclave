import { requireJudge, json } from "../_shared/auth.js";
import { isSameOrigin, readJsonBody } from "../../../functions/_shared/auth.js";
import {
  judgeData,
  writeGuard,
  historyStatement,
} from "../_shared/evaluations.js";
import { AWARDS, validScores, validNominations } from "../../shared/evaluation.js";
const fail = (error, status = 400) => json({ ok: false, error }, status);
export async function onRequestGet(context) {
  const auth = await requireJudge(context);
  if (auth.response) return auth.response;
  try {
    const data = await judgeData(context.env.DB, auth.session.judge_id);
    return json({
      ok: true,
      ...data,
      evaluations: data.evaluations.map((e) =>
        e.judge_id === auth.session.judge_id
          ? e
          : {
              team_id: e.team_id,
              revision: e.revision,
              status: "draft",
              nominations: [],
              nominations_saved: 0,
              scores: {},
            },
      ),
    });
  } catch {
    return fail("Could not load your assigned teams. Try again.", 500);
  }
}
export async function onRequestPost(context) {
  const auth = await requireJudge(context);
  if (auth.response) return auth.response;
  if (!isSameOrigin(context.request))
    return fail("Request origin could not be verified.", 403);
  let body;
  try {
    body = await readJsonBody(context.request);
  } catch {
    return fail("Invalid request.");
  }
  if (
    !Number.isSafeInteger(body?.teamId) ||
    !Number.isSafeInteger(body?.revision) ||
    body.revision < 0 ||
    !["nominations", "scores", "submit"].includes(body.action)
  )
    return fail("Invalid evaluation request.");
  try {
    const db = context.env.DB,
      judgeId = auth.session.judge_id,
      data = await judgeData(db, judgeId);
    const team = data.teams.find((t) => t.team_id === body.teamId);
    if (!team) return fail("This team is not assigned to you.", 403);
    const previous = data.evaluations.find((e) => e.team_id === body.teamId);
    if (previous?.status === "submitted")
      return fail(
        "This evaluation has been submitted and is locked. Contact the venue team if it needs to be reopened.",
        409,
      );
    if ((previous?.revision || 0) !== body.revision)
      return fail(
        "This evaluation changed in another window. Reload it before saving.",
        409,
      );
    if (data.routeNeedsReview)
      return fail(
        "Your assigned route needs venue team review after a seating change. Please contact the venue team.",
        409,
      );
    const awards = AWARDS[team.sector_track];
    if (!awards)
      return fail(
        "The team sector has no evaluation form. Contact the venue team.",
        409,
      );
    const owned = previous?.judge_id === judgeId;
    const next = {
      team_id: team.team_id,
      judge_id: judgeId,
      revision: body.revision + 1,
      status: "draft",
      nominations: owned ? previous.nominations : [],
      nominations_saved: owned ? previous.nominations_saved : 0,
      scores: owned ? previous.scores : {},
      team_snapshot: team,
      updated_at: new Date().toISOString(),
      submitted_at: null,
    };
    if (body.action === "nominations") {
      if (
        !validNominations(body.nominations, team.sector_track)
      )
        return fail("Choose exactly one award or None of the above.");
      next.nominations = body.nominations;
      next.nominations_saved = 1;
    } else if (body.action === "scores") {
      if (!validScores(body.scores))
        return fail("Each mark must be a whole number from 0 to 5.");
      next.scores = body.scores;
    } else {
      if (
        !next.nominations_saved ||
        !validScores(next.scores, true) ||
        !validNominations(next.nominations, team.sector_track)
      )
        return fail(
          "Save the nomination step and all five scores before submitting.",
        );
      next.status = "submitted";
      next.submitted_at = next.updated_at;
    }
    await db.batch([
      writeGuard(
        db,
        data.revision,
        auth.session.username,
        "evaluation_" + body.action,
        { teamId: team.team_id, judgeId },
      ),
      db
        .prepare(
          `INSERT INTO judging_evaluations(team_id,judge_id,revision,status,nominations,nominations_saved,scores,team_snapshot,updated_at,submitted_at) VALUES(?,?,?,?,?,?,?,?,?,?)
 ON CONFLICT(team_id) DO UPDATE SET judge_id=excluded.judge_id,revision=excluded.revision,status=excluded.status,nominations=excluded.nominations,nominations_saved=excluded.nominations_saved,scores=excluded.scores,team_snapshot=excluded.team_snapshot,updated_at=excluded.updated_at,submitted_at=excluded.submitted_at`,
        )
        .bind(
          next.team_id,
          next.judge_id,
          next.revision,
          next.status,
          JSON.stringify(next.nominations),
          next.nominations_saved,
          JSON.stringify(next.scores),
          JSON.stringify(team),
          next.updated_at,
          next.submitted_at,
        ),
      historyStatement(db, auth.session.username, body.action, previous, next),
    ]);
    return json({ ok: true, evaluation: next });
  } catch (e) {
    if (/judging_stale_revision|UNIQUE constraint/.test(e.message))
      return fail(
        "Assignments or evaluations changed while saving. Reload and review before trying again.",
        409,
      );
    return fail(
      "Could not save this evaluation. Your last saved draft is unchanged. Try again.",
      500,
    );
  }
}
