// Inside the attendance transaction, keep a fitting table only when no smaller
// compatible table is free. Release and reclaim atomically when a better fit exists.
export const CLAIM_SQL = `INSERT INTO venue_allocations (team_id, table_id, assigned_by)
 SELECT q.team_id, vt.id, ? FROM venue_requirements q
 JOIN venue_rooms r ON (r.project_mode IS NULL OR r.project_mode = q.project_mode) AND (r.sector IS NULL OR r.sector = q.sector_track)
 AND r.solution_type = q.solution_type
 JOIN venue_tables vt ON vt.room_id = r.id AND vt.seats >= q.present_count
 WHERE q.team_id = ? AND q.present_count >= 2 AND q.lead_present = 1
 AND NOT EXISTS (SELECT 1 FROM venue_allocations a WHERE a.table_id = vt.id)
 AND NOT EXISTS (SELECT 1 FROM venue_allocations a WHERE a.team_id = q.team_id)
 ORDER BY vt.seats, r.id, vt.table_number LIMIT 1`;

export function allocationStatements(db, teamId, mode, username) {
  return [
    db.prepare(`INSERT INTO venue_checkins (team_id, project_mode) VALUES (?, ?)
      ON CONFLICT(team_id) DO UPDATE SET project_mode = excluded.project_mode`).bind(teamId, mode),
    db.prepare(`DELETE FROM venue_allocations WHERE team_id = ? AND NOT EXISTS (
      SELECT 1 FROM venue_requirements q JOIN venue_tables vt ON vt.id = venue_allocations.table_id
      JOIN venue_rooms r ON r.id = vt.room_id WHERE q.team_id = venue_allocations.team_id
      AND (r.project_mode IS NULL OR r.project_mode = q.project_mode) AND (r.sector IS NULL OR r.sector = q.sector_track)
      AND r.solution_type = q.solution_type
      AND vt.seats >= q.present_count AND q.present_count >= 2 AND q.lead_present = 1
      AND NOT EXISTS (
        SELECT 1 FROM venue_tables smaller JOIN venue_rooms sr ON sr.id=smaller.room_id
        WHERE smaller.seats >= q.present_count AND smaller.seats < vt.seats
        AND (sr.project_mode IS NULL OR sr.project_mode=q.project_mode)
        AND (sr.sector IS NULL OR sr.sector=q.sector_track)
        AND sr.solution_type=q.solution_type
        AND NOT EXISTS (SELECT 1 FROM venue_allocations occupied WHERE occupied.table_id=smaller.id)
      ))`).bind(teamId),
    db.prepare(CLAIM_SQL).bind(username || 'attendance-desk', teamId),
  ];
}

export async function getAllocation(db, teamId) {
  return db.prepare(`SELECT q.project_mode, q.present_count, q.lead_present,
    a.table_id, r.name AS room_name, r.block, vt.table_number, vt.seats AS table_seats
    FROM venue_requirements q LEFT JOIN venue_allocations a ON a.team_id = q.team_id
    LEFT JOIN venue_tables vt ON vt.id = a.table_id LEFT JOIN venue_rooms r ON r.id = vt.room_id
    WHERE q.team_id = ?`).bind(teamId).first();
}
