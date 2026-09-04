import {
  getSession,
  isSameOrigin,
  readJsonBody,
} from "../../_shared/auth.js";
import {
  changedFields,
  validateLegacyEdit,
  validatePanelEdit,
  validateTeamEdit,
} from "../../_shared/registrationEdits.js";
import {
  getRegistrationTables,
  loadHackathonRegistrations,
  loadPanelRegistrations,
} from "../../_shared/registrations.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function validId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function auditStatement(db, {
  requestId,
  session,
  registrationType,
  recordType,
  registrationId,
  before,
  after,
  fields,
}) {
  const sourceTable = {
    panel: "panel_registrations",
    team: "hackathon_teams",
    legacy: "hackathon_registrations",
  }[recordType];
  if (!sourceTable) throw new Error("invalid-audit-record-type");
  return db.prepare(
    `INSERT INTO admin_registration_audit (
      request_id, admin_user_id, admin_username, registration_type,
      record_type, registration_id, before_json, after_json,
      changed_fields_json
    ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM ${sourceTable}
        WHERE id = ? AND last_edit_request_id = ?
      )`,
  ).bind(
    requestId,
    session.userId,
    session.username,
    registrationType,
    recordType,
    registrationId,
    JSON.stringify(before),
    JSON.stringify(after),
    JSON.stringify(fields),
    registrationId,
    requestId,
  );
}

async function updatedRegistration(db, registrationType, recordType, id) {
  const tables = await getRegistrationTables(db);
  const registrations = registrationType === "panel"
    ? await loadPanelRegistrations(db, tables)
    : await loadHackathonRegistrations(db, tables);
  return registrations.find(
    (item) => item.id === id && (
      registrationType === "panel" || item.record_type === recordType
    ),
  ) || null;
}

function panelSnapshot(row) {
  return {
    name: row.name,
    phone: row.phone,
    participant_type: row.participant_type,
    organisation: row.organisation,
    department: row.department,
    panel_selection: row.panel_selection,
    industry_sector: row.industry_sector,
    industry_sector_other: row.industry_sector_other,
    organisation_type: row.organisation_type,
    organisation_type_other: row.organisation_type_other,
    updates_opt_in: Number(row.updates_opt_in || 0),
  };
}

async function updatePanel(context, id, session, body) {
  const parsed = validatePanelEdit(body);
  if (parsed.fields)
    return json({ ok: false, error: "Review the highlighted fields.", fields: parsed.fields }, 400);
  const db = context.env.DB;
  const current = await db.prepare(
    `SELECT id, name, phone, participant_type, organisation, department,
      panel_selection, industry_sector, industry_sector_other,
      organisation_type, organisation_type_other, updates_opt_in, edit_version
     FROM panel_registrations WHERE id = ? LIMIT 1`,
  ).bind(id).first();
  if (!current) return json({ ok: false, error: "Panel registration not found." }, 404);
  if (Number(current.edit_version) !== parsed.version)
    return json({ ok: false, error: "This registration changed after you opened it. Reload it and try again.", code: "edit_conflict" }, 409);

  const before = panelSnapshot(current);
  const after = parsed.value;
  const fields = changedFields(before, after);
  if (!fields.length) {
    const registration = await updatedRegistration(db, "panel", "panel", id);
    return json({ ok: true, registration });
  }
  const requestId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(
      `UPDATE panel_registrations SET
        name = ?, phone = ?, participant_type = ?, organisation = ?,
        department = ?, panel_selection = ?, industry_sector = ?,
        industry_sector_other = ?, organisation_type = ?,
        organisation_type_other = ?, updates_opt_in = ?,
        edit_version = edit_version + 1, last_edit_request_id = ?
       WHERE id = ? AND edit_version = ?`,
    ).bind(
      after.name,
      after.phone,
      after.participant_type,
      after.organisation,
      after.department,
      after.panel_selection,
      after.industry_sector,
      after.industry_sector_other,
      after.organisation_type,
      after.organisation_type_other,
      after.updates_opt_in,
      requestId,
      id,
      parsed.version,
    ),
    auditStatement(db, {
      requestId,
      session,
      registrationType: "panel",
      recordType: "panel",
      registrationId: id,
      before,
      after,
      fields,
    }),
  ]);
  if (Number(results[0]?.meta?.changes || 0) !== 1)
    return json({ ok: false, error: "This registration changed while it was being saved. Reload it and try again.", code: "edit_conflict" }, 409);
  const registration = await updatedRegistration(db, "panel", "panel", id);
  return json({ ok: true, registration });
}

function teamSnapshot(team, members) {
  return {
    team_name: team.team_name,
    participant_category: team.participant_category,
    sector_track: team.sector_track,
    solution_type: team.solution_type,
    members: members.map((member) => ({
      id: member.id,
      full_name: member.full_name,
      phone: member.phone,
      institution: member.institution,
      department_or_course: member.department_or_course,
      year_or_grade: member.year_or_grade,
    })),
  };
}

async function updateTeam(context, id, session, body) {
  const parsed = validateTeamEdit(body);
  if (parsed.fields)
    return json({ ok: false, error: "Review the highlighted fields.", fields: parsed.fields }, 400);
  const db = context.env.DB;
  const [team, memberResult] = await Promise.all([
    db.prepare(
      `SELECT id, team_name, participant_category, sector_track, solution_type,
        edit_version FROM hackathon_teams WHERE id = ? AND submitted_at IS NOT NULL LIMIT 1`,
    ).bind(id).first(),
    db.prepare(
      `SELECT id, member_order, full_name, phone, institution,
        department_or_course, year_or_grade, edit_version
       FROM hackathon_team_members WHERE team_id = ? ORDER BY member_order`,
    ).bind(id).all(),
  ]);
  if (!team) return json({ ok: false, error: "Hackathon team not found." }, 404);
  const members = memberResult.results || [];
  if (Number(team.edit_version) !== parsed.version)
    return json({ ok: false, error: "This team changed after you opened it. Reload it and try again.", code: "edit_conflict" }, 409);
  if (members.length !== parsed.value.members.length)
    return json({ ok: false, error: "The team membership changed. Reload it and try again.", code: "edit_conflict" }, 409);
  const currentById = new Map(members.map((member) => [Number(member.id), member]));
  for (const member of parsed.value.members) {
    const current = currentById.get(member.id);
    if (!current || Number(current.edit_version) !== member.version)
      return json({ ok: false, error: "A team member changed after you opened this record. Reload it and try again.", code: "edit_conflict" }, 409);
  }

  const before = teamSnapshot(team, members);
  const after = {
    team_name: parsed.value.team_name,
    participant_category: parsed.value.participant_category,
    sector_track: parsed.value.sector_track,
    solution_type: parsed.value.solution_type,
    members: parsed.value.members.map(({ version, ...member }) => member),
  };
  const fields = changedFields(before, after);
  if (!fields.length) {
    const registration = await updatedRegistration(db, "hackathon", "team", id);
    return json({ ok: true, registration });
  }
  const requestId = crypto.randomUUID();
  const statements = [
    db.prepare(
      `UPDATE hackathon_teams SET team_name = ?, team_name_key = ?,
        participant_category = ?, sector_track = ?, solution_type = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        edit_version = edit_version + 1, last_edit_request_id = ?
       WHERE id = ? AND edit_version = ?`,
    ).bind(
      after.team_name,
      after.team_name.toLowerCase(),
      after.participant_category,
      after.sector_track,
      after.solution_type,
      requestId,
      id,
      parsed.version,
    ),
    ...parsed.value.members.map((member) => db.prepare(
      `UPDATE hackathon_team_members SET full_name = ?, phone = ?,
        institution = ?, department_or_course = ?, year_or_grade = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        edit_version = edit_version + 1, last_edit_request_id = ?
       WHERE id = ? AND team_id = ? AND edit_version = ?`,
    ).bind(
      member.full_name,
      member.phone,
      member.institution,
      member.department_or_course,
      member.year_or_grade,
      requestId,
      member.id,
      id,
      member.version,
    )),
    auditStatement(db, {
      requestId,
      session,
      registrationType: "hackathon",
      recordType: "team",
      registrationId: id,
      before,
      after,
      fields,
    }),
  ];
  const results = await db.batch(statements);
  const writeResults = results.slice(0, 1 + parsed.value.members.length);
  if (writeResults.some((result) => Number(result?.meta?.changes || 0) !== 1))
    return json({ ok: false, error: "This team changed while it was being saved. Reload it and try again.", code: "edit_conflict" }, 409);
  const registration = await updatedRegistration(db, "hackathon", "team", id);
  return json({ ok: true, registration });
}

function legacySnapshot(row) {
  let tracks = [];
  try {
    const parsed = JSON.parse(row.tracks || "[]");
    if (Array.isArray(parsed)) tracks = parsed;
  } catch {}
  return {
    name: row.name,
    phone: row.phone,
    participant_type: row.participant_type,
    organisation: row.organisation,
    tracks,
    challenge_area: row.challenge_area,
    subcategory: row.subcategory,
    problem_area: row.problem_area,
    idea_summary: row.idea_summary,
  };
}

async function updateLegacy(context, id, session, body) {
  const parsed = validateLegacyEdit(body);
  if (parsed.fields)
    return json({ ok: false, error: "Review the highlighted fields.", fields: parsed.fields }, 400);
  const db = context.env.DB;
  const current = await db.prepare(
    `SELECT id, name, phone, participant_type, organisation, tracks,
      challenge_area, subcategory, problem_area, idea_summary, edit_version
     FROM hackathon_registrations WHERE id = ? LIMIT 1`,
  ).bind(id).first();
  if (!current) return json({ ok: false, error: "Hackathon registration not found." }, 404);
  if (Number(current.edit_version) !== parsed.version)
    return json({ ok: false, error: "This registration changed after you opened it. Reload it and try again.", code: "edit_conflict" }, 409);
  const before = legacySnapshot(current);
  const after = parsed.value;
  const fields = changedFields(before, after);
  if (!fields.length) {
    const registration = await updatedRegistration(db, "hackathon", "legacy", id);
    return json({ ok: true, registration });
  }
  const requestId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(
      `UPDATE hackathon_registrations SET name = ?, phone = ?,
        participant_type = ?, organisation = ?, tracks = ?, challenge_area = ?,
        subcategory = ?, problem_area = ?, idea_summary = ?,
        edit_version = edit_version + 1, last_edit_request_id = ?
       WHERE id = ? AND edit_version = ?`,
    ).bind(
      after.name,
      after.phone,
      after.participant_type,
      after.organisation,
      JSON.stringify(after.tracks),
      after.challenge_area,
      after.subcategory,
      after.problem_area,
      after.idea_summary,
      requestId,
      id,
      parsed.version,
    ),
    auditStatement(db, {
      requestId,
      session,
      registrationType: "hackathon",
      recordType: "legacy",
      registrationId: id,
      before,
      after,
      fields,
    }),
  ]);
  if (Number(results[0]?.meta?.changes || 0) !== 1)
    return json({ ok: false, error: "This registration changed while it was being saved. Reload it and try again.", code: "edit_conflict" }, 409);
  const registration = await updatedRegistration(db, "hackathon", "legacy", id);
  return json({ ok: true, registration });
}

export async function onRequestPatch(context) {
  if (!context.env?.DB)
    return json({ ok: false, error: "Registration database is unavailable." }, 503);
  if (!isSameOrigin(context.request))
    return json({ ok: false, error: "This edit request could not be verified." }, 403);
  const session = await getSession(context);
  if (!session) return json({ ok: false, error: "Authentication required." }, 401);
  if (session.registrationsAccess !== "write")
    return json({ ok: false, error: "Your account cannot edit registrations." }, 403);
  const id = validId(context.params.id);
  if (!id) return json({ ok: false, error: "Invalid registration id." }, 400);
  const url = new URL(context.request.url);
  const registrationType = url.searchParams.get("type") || "panel";
  const recordType = url.searchParams.get("record_type") || (registrationType === "hackathon" ? "legacy" : "panel");
  let body;
  try {
    body = await readJsonBody(context.request, 16_384);
  } catch {
    return json({ ok: false, error: "The edit request was invalid or too large." }, 400);
  }
  try {
    if (registrationType === "panel" && recordType === "panel")
      return await updatePanel(context, id, session, body);
    if (registrationType === "hackathon" && recordType === "team")
      return await updateTeam(context, id, session, body);
    if (registrationType === "hackathon" && recordType === "legacy")
      return await updateLegacy(context, id, session, body);
    return json({ ok: false, error: "Invalid registration type." }, 400);
  } catch (error) {
    console.error(JSON.stringify({
      event: "dashboard_registration_edit_failed",
      registrationType,
      recordType,
      registrationId: id,
      reason: error instanceof Error ? error.message : "unknown",
    }));
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: hackathon_teams.team_name_key"))
      return json({ ok: false, error: "That team name is already registered.", fields: { team_name: "Choose a different team name." } }, 409);
    return json({ ok: false, error: "Could not save the registration changes." }, 500);
  }
}

export async function onRequestDelete(context) {
  if (!isSameOrigin(context.request))
    return json(
      { ok: false, error: "This delete request could not be verified." },
      403,
    );
  const session = await getSession(context);
  if (!session)
    return json({ ok: false, error: "Authentication required." }, 401);
  if (session.registrationsAccess !== "write")
    return json({ ok: false, error: "Your account cannot delete registrations." }, 403);

  const url = new URL(context.request.url);
  const registrationType = url.searchParams.get("type") || "panel";
  if (!new Set(["panel", "hackathon"]).has(registrationType))
    return json({ ok: false, error: "Invalid registration type." }, 400);
  const recordType =
    url.searchParams.get("record_type") ||
    (registrationType === "hackathon" ? "legacy" : "panel");
  if (
    registrationType === "hackathon" &&
    !new Set(["team", "legacy"]).has(recordType)
  )
    return json({ ok: false, error: "Invalid hackathon record type." }, 400);

  const id = validId(context.params.id);
  if (!id)
    return json({ ok: false, error: "Invalid registration id." }, 400);

  try {
    if (registrationType === "hackathon" && recordType === "team") {
      const results = await context.env.DB.batch([
        context.env.DB.prepare(
          "DELETE FROM hackathon_member_claims WHERE team_id = ?",
        ).bind(id),
        context.env.DB.prepare(
          "DELETE FROM hackathon_team_members WHERE team_id = ?",
        ).bind(id),
        context.env.DB.prepare("DELETE FROM hackathon_teams WHERE id = ?").bind(
          id,
        ),
      ]);
      if (!results[2]?.meta?.changes)
        return json({ ok: false, error: "Hackathon team not found." }, 404);
      return json({ ok: true, id, registrationType, recordType });
    }
    const table =
      registrationType === "panel"
        ? "panel_registrations"
        : "hackathon_registrations";
    const result = await context.env.DB.prepare(
      `DELETE FROM ${table} WHERE id = ?`,
    )
      .bind(id)
      .run();
    if (!result?.meta?.changes)
      return json({ ok: false, error: "Registration not found." }, 404);
    return json({ ok: true, id, registrationType, recordType });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "registration delete failed",
        registrationType,
        registrationId: id,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return json({ ok: false, error: "Could not delete registration." }, 500);
  }
}
