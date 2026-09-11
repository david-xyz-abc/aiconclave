import { decodeEvaluation } from "../../shared/evaluation.js";
import { loadWorkspace } from "../api/workspace.js";
import { judgeRoute } from "../../shared/assignments.js";
export async function judgeData(db, judgeId) {
  const results = await db.batch([
    db.prepare("SELECT revision FROM judging_state WHERE id=1"),
    db
      .prepare(
        `SELECT a.team_id, a.visit_order, a.table_id AS assigned_table_id, t.team_name,t.team_code,t.participant_category,
   t.sector_track,t.solution_type,c.project_mode,r.name AS room_name,r.block,vt.id AS table_id,vt.table_number,
   COALESCE((SELECT m.full_name FROM hackathon_team_members m WHERE m.team_id=t.id AND m.id=t.attendance_lead_member_id), (SELECT m.full_name FROM hackathon_team_members m WHERE m.team_id=t.id AND m.role='Captain' ORDER BY m.member_order LIMIT 1), (SELECT m.full_name FROM hackathon_team_members m WHERE m.team_id=t.id ORDER BY m.member_order LIMIT 1)) AS leader_name
   FROM judging_assignments a JOIN hackathon_teams t ON t.id=a.team_id
   LEFT JOIN venue_checkins c ON c.team_id=t.id LEFT JOIN venue_allocations va ON va.team_id=t.id
   LEFT JOIN venue_tables vt ON vt.id=va.table_id LEFT JOIN venue_rooms r ON r.id=vt.room_id
   WHERE a.judge_id=? ORDER BY a.visit_order`,
      )
      .bind(judgeId),
    db
      .prepare(
        "SELECT e.* FROM judging_evaluations e JOIN judging_assignments a ON a.team_id=e.team_id WHERE a.judge_id=?",
      )
      .bind(judgeId),
    db.prepare("SELECT id,name FROM judging_judges WHERE id=?").bind(judgeId),
  ]);
  const workspace = await loadWorkspace(db);
  const judge = workspace.judges.find((j) => j.id === judgeId);
  return {
    revision: results[0].results[0].revision,
    teams: results[1].results,
    evaluations: results[2].results.map(decodeEvaluation),
    judge: results[3].results[0],
    routeNeedsReview: !judge || judgeRoute(workspace, judge).needsReview,
  };
}
export function writeGuard(db, revision, actor, action, details) {
  return db
    .prepare(
      "INSERT INTO judging_changes(id,expected_revision,actor,action,details) VALUES(?,?,?,?,?)",
    )
    .bind(
      crypto.randomUUID(),
      revision,
      actor,
      action,
      JSON.stringify(details),
    );
}
export function historyStatement(
  db,
  actor,
  action,
  previous,
  next,
  reason = "",
) {
  return db
    .prepare(
      "INSERT INTO judging_evaluation_history(id,team_id,judge_id,actor,action,reason,previous_snapshot,next_snapshot) VALUES(?,?,?,?,?,?,?,?)",
    )
    .bind(
      crypto.randomUUID(),
      next.team_id,
      next.judge_id,
      actor,
      action,
      reason,
      previous ? JSON.stringify(previous) : null,
      JSON.stringify(next),
    );
}
