import { readFileSync } from "node:fs";
import { fixture } from "./venueFixture.js";
export function judgingFixture(access = "write") {
  const f = fixture(access);
  f.sqlite.exec(
    readFileSync(
      new URL("../db/migrations/0021_judging_admin.sql", import.meta.url),
      "utf8",
    ),
  );
  for (let id = 1; id <= 8; id++) {
    if (id > 1) {
      f.sqlite
        .prepare(`INSERT INTO hackathon_teams VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(
          id,
          "AIC-" + id,
          "Team " + id,
          "College",
          "Agriculture",
          "Technical",
          3,
          null,
          "2026-09-11",
          null,
        );
      for (let n = 1; n <= 3; n++)
        f.sqlite
          .prepare("INSERT INTO hackathon_team_members VALUES (?,?,?,?,?,?,?)")
          .run(
            id * 10 + n,
            id,
            "Member " + n,
            "",
            "",
            n === 1 ? "Captain" : "Member",
            n,
          );
    }
    f.sqlite
      .prepare("INSERT INTO venue_checkins VALUES (?, 'Prepared')")
      .run(id);
    for (let n = 1; n <= 3; n++)
      f.sqlite
        .prepare(
          "INSERT INTO hackathon_attendance(team_id,member_id,attendance_date,present,marked_by) VALUES (?,?,'2026-09-11',1,'test')",
        )
        .run(id, id * 10 + n);
  }
  const tables = f.sqlite
    .prepare(
      "SELECT vt.id,r.id AS room FROM venue_tables vt JOIN venue_rooms r ON r.id=vt.room_id WHERE r.project_mode='Prepared' AND r.sector='Agriculture' AND r.solution_type='Technical' AND r.seats=3 ORDER BY r.id,vt.table_number",
    )
    .all();
  [0, 1, 2, 3, 10, 11, 12, 13].forEach((idx, i) =>
    f.sqlite
      .prepare(
        "INSERT INTO venue_allocations(team_id,table_id,assigned_by) VALUES (?,?,'test')",
      )
      .run(i + 1, tables[idx].id),
  );
  return f;
}
