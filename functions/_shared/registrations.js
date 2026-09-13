const REGISTRATION_TABLES = [
  "panel_registrations",
  "hackathon_registrations",
  "hackathon_teams",
  "hackathon_team_members",
  "hackathon_member_claims",
];

export async function getRegistrationTables(db) {
  const placeholders = REGISTRATION_TABLES.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`,
    )
    .bind(...REGISTRATION_TABLES)
    .all();
  return new Set((result.results || []).map((row) => row.name));
}

export function hasTeamRegistrationTables(tables) {
  return tables.has("hackathon_teams") && tables.has("hackathon_team_members");
}

export async function loadPanelRegistrations(db, tables, id = null) {
  if (!tables.has("panel_registrations")) return [];
  const result = await db
    .prepare(
      `SELECT id, name, email, phone, participant_type, organisation, department,
      panel_selection, industry_sector, industry_sector_other,
      organisation_type, organisation_type_other,
      information_confirmed, updates_opt_in, edit_version, created_at
    FROM panel_registrations
    ${id === null ? "" : "WHERE id = ?"}
    ORDER BY datetime(created_at) DESC, id DESC`,
    )
    .bind(...(id === null ? [] : [id]))
    .all();
  return result.results || [];
}

function mapTeamRows(rows) {
  const teams = new Map();
  for (const row of rows) {
    if (!teams.has(row.id)) {
      teams.set(row.id, {
        id: row.id,
        record_type: "team",
        team_code: row.team_code,
        team_name: row.team_name,
        participant_category: row.participant_category,
        team_size: row.team_size,
        sector_track: row.sector_track,
        solution_type: row.solution_type,
        information_confirmed: row.information_confirmed,
        rules_accepted: row.rules_accepted,
        updates_opt_in: row.updates_opt_in,
        edit_version: row.edit_version,
        submitted_at: row.submitted_at,
        created_at: row.submitted_at || row.created_at,
        members: [],
      });
    }
    if (row.member_id) {
      teams.get(row.id).members.push({
        id: row.member_id,
        member_order: row.member_order,
        role: row.role,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        institution: row.institution,
        department_or_course: row.department_or_course,
        year_or_grade: row.year_or_grade,
        edit_version: row.member_edit_version,
      });
    }
  }
  return [...teams.values()];
}

export async function loadHackathonRegistrations(db, tables, id = null, recordType = null) {
  const registrations = [];
  if (hasTeamRegistrationTables(tables) && recordType !== "legacy") {
    const teamResult = await db
      .prepare(
        `SELECT
        t.id, t.team_code, t.team_name, t.participant_category, t.team_size,
        t.sector_track, t.solution_type, t.information_confirmed,
        t.rules_accepted, t.updates_opt_in, t.edit_version, t.submitted_at, t.created_at,
        m.id AS member_id, m.member_order, m.role, m.full_name, m.email,
        m.phone, m.institution, m.department_or_course, m.year_or_grade,
        m.edit_version AS member_edit_version
      FROM hackathon_teams t
      LEFT JOIN hackathon_team_members m ON m.team_id = t.id
      WHERE t.submitted_at IS NOT NULL ${id === null ? "" : "AND t.id = ?"}
      ORDER BY datetime(COALESCE(t.submitted_at, t.created_at)) DESC, t.id DESC, m.member_order ASC`,
      )
      .bind(...(id === null ? [] : [id]))
    .all();
    registrations.push(...mapTeamRows(teamResult.results || []));
  }
  if (tables.has("hackathon_registrations") && recordType !== "team") {
    const legacyResult = await db
      .prepare(
        `SELECT id, name, email, phone, participant_type, organisation, tracks,
        challenge_area, subcategory, problem_area, idea_summary,
        information_confirmed, edit_version, created_at
      FROM hackathon_registrations
      ${id === null ? "" : "WHERE id = ?"}
      ORDER BY datetime(created_at) DESC, id DESC`,
      )
      .bind(...(id === null ? [] : [id]))
    .all();
    registrations.push(
      ...(legacyResult.results || []).map((row) => ({
        ...row,
        record_type: "legacy",
      })),
    );
  }
  return registrations.sort((left, right) =>
    String(right.created_at || "").localeCompare(String(left.created_at || "")),
  );
}

async function runNamedBatch(db, entries) {
  if (!entries.length) return {};
  const results = await db.batch(entries.map((entry) => entry.statement));
  return Object.fromEntries(
    entries.map((entry, index) => [entry.name, results[index]?.results || []]),
  );
}

export async function loadRegistrationSummary(db, tables) {
  const entries = [];
  if (tables.has("panel_registrations")) {
    entries.push(
      {
        name: "panelCounts",
        statement: db.prepare(
          `SELECT COUNT(*) AS total, SUM(CASE WHEN participant_type = 'Student' THEN 1 ELSE 0 END) AS students FROM panel_registrations`,
        ),
      },
      {
        name: "recentPanels",
        statement: db.prepare(
          `SELECT id, name, 'panel' AS registration_type, panel_selection AS activity_label, created_at FROM panel_registrations ORDER BY datetime(created_at) DESC, id DESC LIMIT 5`,
        ),
      },
    );
  }
  if (hasTeamRegistrationTables(tables)) {
    entries.push(
      {
        name: "teamCounts",
        statement: db.prepare(
          `SELECT COUNT(*) AS total, COALESCE(SUM(team_size), 0) AS students, SUM(CASE WHEN participant_category = 'School' THEN 1 ELSE 0 END) AS school_teams, SUM(CASE WHEN participant_category = 'College' THEN 1 ELSE 0 END) AS college_teams FROM hackathon_teams WHERE submitted_at IS NOT NULL`,
        ),
      },
      {
        name: "recentTeams",
        statement: db.prepare(
          `SELECT id, team_name AS name, 'hackathon' AS registration_type, sector_track || ' · ' || solution_type AS activity_label, COALESCE(submitted_at, created_at) AS created_at FROM hackathon_teams WHERE submitted_at IS NOT NULL ORDER BY datetime(COALESCE(submitted_at, created_at)) DESC, id DESC LIMIT 5`,
        ),
      },
    );
  }
  if (tables.has("hackathon_registrations")) {
    entries.push(
      {
        name: "legacyCounts",
        statement: db.prepare(
          `SELECT COUNT(*) AS total FROM hackathon_registrations`,
        ),
      },
      {
        name: "recentLegacy",
        statement: db.prepare(
          `SELECT id, name, 'hackathon' AS registration_type, challenge_area || ' · ' || subcategory AS activity_label, created_at FROM hackathon_registrations ORDER BY datetime(created_at) DESC, id DESC LIMIT 5`,
        ),
      },
    );
  }
  const result = await runNamedBatch(db, entries);
  const panelCounts = result.panelCounts?.[0] || {};
  const teamCounts = result.teamCounts?.[0] || {};
  const legacyCounts = result.legacyCounts?.[0] || {};
  const panelTotal = Number(panelCounts.total || 0);
  const teamTotal = Number(teamCounts.total || 0);
  const legacyTotal = Number(legacyCounts.total || 0);
  const hackathonTotal = teamTotal + legacyTotal;
  const hackathonStudents = Number(teamCounts.students || 0) + legacyTotal;
  const recent = [
    ...(result.recentPanels || []),
    ...(result.recentTeams || []),
    ...(result.recentLegacy || []),
  ]
    .sort((left, right) =>
      String(right.created_at || "").localeCompare(
        String(left.created_at || ""),
      ),
    )
    .slice(0, 5);
  return {
    summary: {
      total: panelTotal + hackathonTotal,
      panelTotal,
      hackathonTotal,
      students: Number(panelCounts.students || 0) + hackathonStudents,
      hackathonStudents,
      schoolTeams: Number(teamCounts.school_teams || 0),
      collegeTeams: Number(teamCounts.college_teams || 0),
    },
    recent,
  };
}

export async function loadRegistrationDirectory(db, tables, type) {
  if (type === 'panel') {
    if (!tables.has('panel_registrations')) return [];
    return (await db.prepare(`SELECT id, name, email, participant_type, organisation,
      department, panel_selection, industry_sector, created_at FROM panel_registrations
      ORDER BY created_at DESC, id DESC`).all()).results || [];
  }
  const rows = [];
  if (hasTeamRegistrationTables(tables)) {
    rows.push(...((await db.prepare(`SELECT t.id, 'team' AS record_type, t.team_code,
      t.team_name, t.participant_category, t.team_size, t.sector_track, t.solution_type,
      COALESCE(t.submitted_at, t.created_at) AS created_at,
      (SELECT m.full_name FROM hackathon_team_members m WHERE m.team_id = t.id
       ORDER BY m.member_order LIMIT 1) AS captain_name
      FROM hackathon_teams t WHERE t.submitted_at IS NOT NULL`).all()).results || []));
  }
  if (tables.has('hackathon_registrations')) {
    rows.push(...((await db.prepare(`SELECT id, 'legacy' AS record_type, name, email,
      participant_type, organisation, tracks, challenge_area, subcategory, created_at
      FROM hackathon_registrations`).all()).results || []));
  }
  return rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}
