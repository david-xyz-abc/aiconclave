import { attendanceJson, requireAttendanceAdmin, requireAttendanceSession } from '../../_shared/attendance.js';
import { isSameOrigin, readJsonBody } from '../../_shared/auth.js';

export async function onRequestGet(context) {
  const auth = await requireAttendanceSession(context);
  if (auth.response) return auth.response;
  if (!['read', 'write'].includes(auth.session.attendance_access)) return attendanceJson({ ok: false, error: 'Attendance access required.' }, 403);
  try {
    const results = await context.env.DB.batch([
      context.env.DB.prepare(`SELECT q.*, a.table_id, r.name AS room_name, r.block, vt.table_number
        FROM venue_requirements q LEFT JOIN venue_allocations a ON a.team_id = q.team_id
        LEFT JOIN venue_tables vt ON vt.id = a.table_id LEFT JOIN venue_rooms r ON r.id = vt.room_id
        ORDER BY lower(q.team_name), q.team_id`),
      context.env.DB.prepare(`SELECT r.*, vt.id AS table_id, vt.table_number, a.team_id, t.team_name, t.team_code
        FROM venue_rooms r JOIN venue_tables vt ON vt.room_id = r.id
        LEFT JOIN venue_allocations a ON a.table_id = vt.id LEFT JOIN hackathon_teams t ON t.id = a.team_id
        ORDER BY r.id, vt.table_number`),
    ]);
    return attendanceJson({ ok: true, teams: results[0].results, tables: results[1].results });
  } catch { return attendanceJson({ ok: false, error: 'Could not load venues. Check the alpha venue migration.' }, 500); }
}

export const MANUAL_SQL = `INSERT INTO venue_allocations (team_id, table_id, assigned_by)
 SELECT q.team_id, vt.id, ? FROM venue_requirements q JOIN venue_rooms r
 ON r.project_mode = q.project_mode AND r.sector = q.sector_track AND r.solution_type = q.solution_type
 AND r.seats = q.present_count JOIN venue_tables vt ON vt.room_id = r.id
 WHERE q.team_id = ? AND vt.id = ? AND q.attendance_marked = 1 AND q.present_count >= 2 AND q.lead_present = 1
 AND NOT EXISTS (SELECT 1 FROM venue_allocations WHERE team_id = q.team_id OR table_id = vt.id)`;

export const REALLOCATE_SQL = `UPDATE venue_allocations SET table_id = ?, assigned_by = ?,
 assigned_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE team_id = ? AND table_id = ? AND table_id <> ?
 AND EXISTS (SELECT 1 FROM venue_requirements q JOIN venue_rooms r
 ON r.project_mode = q.project_mode AND r.sector = q.sector_track
 AND r.solution_type = q.solution_type AND r.seats = q.present_count
 JOIN venue_tables vt ON vt.room_id = r.id
 WHERE q.team_id = venue_allocations.team_id AND vt.id = ?
 AND q.attendance_marked = 1 AND q.present_count >= 2 AND q.lead_present = 1)
 AND NOT EXISTS (SELECT 1 FROM venue_allocations occupied WHERE occupied.table_id = ?)`;

export async function onRequestPatch(context) {
  const auth = await requireAttendanceAdmin(context);
  if (auth.response) return auth.response;
  if (!isSameOrigin(context.request)) return attendanceJson({ ok: false, error: 'Request origin could not be verified.' }, 403);
  let body;
  try { body = await readJsonBody(context.request); } catch { return attendanceJson({ ok: false, error: 'Invalid request.' }, 400); }
  if (![body?.teamId, body?.tableId, body?.currentTableId].every(n => Number.isSafeInteger(n) && n > 0)) return attendanceJson({ ok: false, error: 'Select a team and a new table.' }, 400);
  try {
    const result = await context.env.DB.prepare(REALLOCATE_SQL).bind(body.tableId, auth.session.username || 'staff', body.teamId, body.currentTableId, body.tableId, body.tableId, body.tableId).run();
    if (!result.meta.changes) return attendanceJson({ ok: false, error: 'The assignment changed or the new table is unavailable or incompatible. Refresh and try again; this request did not change the assignment.' }, 409);
    return attendanceJson({ ok: true });
  } catch { return attendanceJson({ ok: false, error: 'Could not reallocate the team. Refresh availability and retry.' }, 500); }
}

export async function onRequestPost(context) {
  const auth = await requireAttendanceAdmin(context);
  if (auth.response) return auth.response;
  if (!isSameOrigin(context.request)) return attendanceJson({ ok: false, error: 'Request origin could not be verified.' }, 403);
  let body;
  try { body = await readJsonBody(context.request); } catch { return attendanceJson({ ok: false, error: 'Invalid request.' }, 400); }
  if (![body?.teamId, body?.tableId].every(n => Number.isSafeInteger(n) && n > 0)) return attendanceJson({ ok: false, error: 'Select a team and table.' }, 400);
  try {
    const result = await context.env.DB.prepare(MANUAL_SQL).bind(auth.session.username || 'staff', body.teamId, body.tableId).run();
    if (!result.meta.changes) return attendanceJson({ ok: false, error: 'Allocation changed or this table is not compatible. Refresh and select an available table. Attendance and project mode must be recorded first.' }, 409);
    return attendanceJson({ ok: true });
  } catch { return attendanceJson({ ok: false, error: 'Could not assign the table. Refresh availability and retry.' }, 500); }
}
