import { requireVenueAdmin, json } from "../_shared/auth.js";
import { isSameOrigin, readJsonBody } from "../../../functions/_shared/auth.js";
import {
  SIDES,
  MODES,
  previewAssignment,
  judgeRoute,
} from "../../shared/assignments.js";

export async function loadWorkspace(db) {
  const results = await db.batch([
    db.prepare("SELECT revision FROM judging_state WHERE id=1"),
    db.prepare(
      "SELECT j.*, u.username AS login_username FROM judging_judges j LEFT JOIN judging_users u ON u.judge_id=j.id ORDER BY lower(j.name), j.id",
    ),
    db.prepare(
      `SELECT r.id, r.name, r.block, r.project_mode, r.sector, r.solution_type,
        (SELECT MIN(seats) FROM venue_tables WHERE room_id=r.id) AS min_seats,
        (SELECT MAX(seats) FROM venue_tables WHERE room_id=r.id) AS max_seats, o.position FROM venue_rooms r JOIN judging_room_order o ON o.room_id=r.id ORDER BY o.position, r.id`,
    ),
    db.prepare(`SELECT q.*, a.table_id, vt.room_id, vt.table_number, vt.seats AS table_seats, r.name AS room_name, r.block,
      j.judge_id, jj.name AS judge_name FROM venue_requirements q
      LEFT JOIN venue_allocations a ON a.team_id=q.team_id LEFT JOIN venue_tables vt ON vt.id=a.table_id
      LEFT JOIN venue_rooms r ON r.id=vt.room_id LEFT JOIN judging_assignments j ON j.team_id=q.team_id
      LEFT JOIN judging_judges jj ON jj.id=j.judge_id ORDER BY q.team_id`),
    db.prepare(
      "SELECT * FROM judging_assignments ORDER BY judge_id, visit_order",
    ),
    db.prepare(
      "SELECT team_id, judge_id, status, revision FROM judging_evaluations",
    ),
  ]);
  return {
    revision: results[0].results[0].revision,
    judges: results[1].results,
    rooms: results[2].results,
    teams: results[3].results,
    assignments: results[4].results,
    evaluations: results[5].results,
  };
}
export async function onRequestGet(context) {
  const auth = await requireVenueAdmin(context);
  if (auth.response) return auth.response;
  try {
    return json({ ok: true, ...(await loadWorkspace(context.env.DB)) });
  } catch {
    return json(
      {
        ok: false,
        error: "The judging workspace could not be loaded. Please try again.",
      },
      500,
    );
  }
}
const fail = (message, status = 400) =>
  json({ ok: false, error: message }, status);
export async function onRequestPost(context) {
  const auth = await requireVenueAdmin(context);
  if (auth.response) return auth.response;
  if (!isSameOrigin(context.request))
    return fail("Request origin could not be verified.", 403);
  let body;
  try {
    body = await readJsonBody(context.request, 32768);
  } catch {
    return fail("Invalid request.");
  }
  if (!body || !Number.isSafeInteger(body.revision) || body.revision < 0)
    return fail("Refresh the workspace before saving.");
  try {
    const db = context.env.DB,
      data = await loadWorkspace(db);
    if (body.revision !== data.revision)
      return fail(
        "The workspace changed. Refresh and review your selection before saving.",
        409,
      );
    const statements = [],
      actor = auth.session.username;
    const judge = data.judges.find((j) => j.id === body.judgeId);
    let details = {};
    if (
      ["assign", "release"].includes(body.action) &&
      data.evaluations.some(
        (e) => e.judge_id === body.judgeId && e.status === "submitted",
      )
    )
      return fail(
        "This judge has submitted evaluations. Reopen them in Emergency before changing the route.",
        409,
      );
    if (
      body.action === "deleteJudge" &&
      data.evaluations.some((e) => e.judge_id === body.judgeId)
    )
      return fail(
        "Judges with evaluation records must be retained for the audit history.",
        409,
      );

    if (body.action === "addJudges") {
      const names = body.names;
      if (
        !Array.isArray(names) ||
        names.length < 1 ||
        names.length > 100 ||
        names.some(
          (n) => typeof n !== "string" || !n.trim() || n.trim().length > 100,
        ) ||
        !SIDES.includes(body.solutionType)
      )
        return fail(
          "Enter up to 100 judge names, one per line, and choose a side.",
        );
      const trimmed = names.map((n) => n.trim());
      if (new Set(trimmed.map((n) => n.toLowerCase())).size !== trimmed.length)
        return fail(
          "The list contains repeated names. Remove duplicates before adding judges.",
        );
      const judges = trimmed.map((name) => ({ id: crypto.randomUUID(), name }));
      for (const j of judges)
        statements.push(
          db
            .prepare(
              "INSERT INTO judging_judges(id,name,solution_type) VALUES(?,?,?)",
            )
            .bind(j.id, j.name, body.solutionType),
        );
      details = { judges, solutionType: body.solutionType };
    } else if (body.action === "saveJudge") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 100 || !SIDES.includes(body.solutionType))
        return fail(
          "Enter a judge name and choose Technical or Non-technical.",
        );
      if (body.judgeId && !judge) return fail("Judge not found.", 404);
      if (
        judge &&
        judge.solution_type !== body.solutionType &&
        data.assignments.some((a) => a.judge_id === judge.id)
      )
        return fail(
          "Release this judge’s assignments before changing their side.",
        );
      const id = judge?.id || crypto.randomUUID();
      statements.push(
        db
          .prepare(
            `INSERT INTO judging_judges(id,name,solution_type) VALUES(?,?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, solution_type=excluded.solution_type`,
          )
          .bind(id, name, body.solutionType),
      );
      details = { judgeId: id, name, solutionType: body.solutionType };
    } else if (body.action === "assign") {
      if (!judge) return fail("Select a judge.");
      const filters = body.filters;
      if (
        !filters ||
        typeof filters.sector !== "string" ||
        typeof filters.mode !== "string" ||
        (filters.mode && !MODES.includes(filters.mode)) ||
        filters.sector.length > 100
      )
        return fail("Choose valid assignment filters.");
      const preview = previewAssignment(
        data,
        judge.id,
        filters,
        body.startTeamId,
        body.count,
      );
      if (preview.error) return fail(preview.error);
      statements.push(
        db
          .prepare("DELETE FROM judging_assignments WHERE judge_id=?")
          .bind(judge.id),
      );
      statements.push(
        db
          .prepare(
            "UPDATE judging_judges SET sector_filter=?, mode_filter=? WHERE id=?",
          )
          .bind(filters.sector, filters.mode, judge.id),
      );
      for (const [index, team] of preview.teams.entries())
        statements.push(
          db
            .prepare(
              "INSERT INTO judging_assignments(team_id,judge_id,table_id,visit_order,assigned_by) VALUES(?,?,?,?,?)",
            )
            .bind(team.team_id, judge.id, team.table_id, index + 1, actor),
        );
      details = {
        judgeId: judge.id,
        previous: data.assignments.filter((a) => a.judge_id === judge.id),
        filters,
        teams: preview.teams.map((t) => ({
          teamId: t.team_id,
          tableId: t.table_id,
        })),
      };
    } else if (body.action === "release" || body.action === "deleteJudge") {
      if (!judge) return fail("Judge not found.", 404);
      const assigned = data.assignments.filter((a) => a.judge_id === judge.id);
      if (body.action === "deleteJudge" && assigned.length)
        return fail("Release the judge’s teams before removing the judge.");
      if (body.action === "deleteJudge") {
        statements.push(
          db
            .prepare(
              "DELETE FROM judging_sessions WHERE user_id IN (SELECT id FROM judging_users WHERE judge_id=?)",
            )
            .bind(judge.id),
        );
        statements.push(
          db
            .prepare("DELETE FROM judging_users WHERE judge_id=?")
            .bind(judge.id),
        );
      }
      statements.push(
        body.action === "release"
          ? db
              .prepare("DELETE FROM judging_assignments WHERE judge_id=?")
              .bind(judge.id)
          : db.prepare("DELETE FROM judging_judges WHERE id=?").bind(judge.id),
      );
      details = { judge, previous: assigned };
    } else if (body.action === "roomOrder") {
      const ids = body.roomIds;
      if (
        !Array.isArray(ids) ||
        ids.length !== data.rooms.length ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => !data.rooms.some((r) => r.id === id))
      )
        return fail("Include every room exactly once.");
      const reordered = {
        ...data,
        rooms: ids.map((id) => data.rooms.find((r) => r.id === id)),
      };
      // Reordering is possible, but staff must repair any existing route already flagged by seating changes.
      if (
        data.judges.some(
          (j) =>
            !judgeRoute(data, j).needsReview &&
            judgeRoute(reordered, j).needsReview,
        )
      )
        return fail(
          "This room order would break an existing judge route. Release the affected assignments first.",
        );
      ids.forEach((id, index) =>
        statements.push(
          db
            .prepare("UPDATE judging_room_order SET position=? WHERE room_id=?")
            .bind(index + 1, id),
        ),
      );
      details = { roomIds: ids };
    } else return fail("Unknown action.");
    // The guard and all writes commit together; stale previews and competing claims roll back completely.
    await db.batch([
      db
        .prepare(
          "INSERT INTO judging_changes(id,expected_revision,actor,action,details) VALUES(?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          body.revision,
          actor,
          body.action,
          JSON.stringify(details),
        ),
      ...statements,
    ]);
    return json({ ok: true });
  } catch (error) {
    if (/judging_stale_revision|UNIQUE constraint/i.test(error.message))
      return fail(
        "The workspace changed while you were saving. Refresh and review the assignment; no partial changes were saved.",
        409,
      );
    return fail(
      "Could not save the change. Refresh the workspace and try again.",
      500,
    );
  }
}
