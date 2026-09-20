import { authenticated, json } from '../../_shared/excelSession.js';

export const OFFLINE_TEAMS_SQL = `SELECT a.team_id, a.visit_order, a.table_id AS assigned_table_id,
 t.team_code, t.team_name, t.participant_category, t.sector_track,
 vt.id AS table_id, vt.table_number, r.name AS room_name,
 q.attendance_marked, q.lead_present, q.present_count, vt.seats AS table_seats
 FROM judging_assignments a JOIN hackathon_teams t ON t.id=a.team_id
 LEFT JOIN venue_allocations va ON va.team_id=t.id
 LEFT JOIN venue_tables vt ON vt.id=va.table_id
 LEFT JOIN venue_rooms r ON r.id=vt.room_id
 LEFT JOIN venue_requirements q ON q.team_id=t.id
 WHERE a.judge_id=? ORDER BY a.visit_order, a.team_id`;

export async function onRequestGet(context) {
  if (!await authenticated(context)) return json({ok:false,error:'Excel login required.'},401);
  const judgeId = new URL(context.request.url).searchParams.get('judge');
  if (judgeId !== null && (!judgeId.trim() || judgeId.length > 100)) {
    return json({ok:false,error:'Choose a valid judge.'},400);
  }
  try {
    const db = context.env.DB;
    if (judgeId === null) {
      const {results} = await db.prepare(`SELECT j.id, j.name, COUNT(a.team_id) AS team_count
        FROM judging_judges j LEFT JOIN judging_assignments a ON a.judge_id=j.id
        GROUP BY j.id, j.name ORDER BY lower(j.name), j.id`).all();
      return json({ok:true,judges:results || []});
    }
    const [judgeResult, teamResult] = await db.batch([
      db.prepare('SELECT id, name FROM judging_judges WHERE id=?').bind(judgeId),
      db.prepare(OFFLINE_TEAMS_SQL).bind(judgeId),
    ]);
    const judge = judgeResult.results?.[0];
    if (!judge) return json({ok:false,error:'Judge not found. Refresh the judge list.'},404);
    const teams = teamResult.results || [];
    if (!teams.length) return json({ok:false,error:'This judge has no assigned teams yet.'},409);
    if (teams.some(team => !team.table_id || team.table_id !== team.assigned_table_id ||
      !team.room_name || !team.attendance_marked || !team.lead_present ||
      team.present_count < 2 || team.present_count > team.table_seats)) {
      return json({ok:false,error:'This judge’s assignments need review. Update the assignments in Judging before downloading.'},409);
    }
    return json({ok:true,judge,teams:teams.map(({team_id,visit_order,team_code,team_name,participant_category,sector_track,room_name,table_number}) =>
      ({team_id,visit_order,team_code,team_name,participant_category,sector_track,room_name,table_number})),generatedAt:new Date().toISOString()});
  } catch {
    return json({ok:false,error:'Could not load offline judging sheets. Please try again.'},500);
  }
}
