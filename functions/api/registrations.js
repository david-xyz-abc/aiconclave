import { getSession } from "../_shared/auth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function onRequestGet(context) {
  const session = await getSession(context);
  if (!session) return json({ ok: false, error: "Authentication required." }, 401);

  const url = new URL(context.request.url);
  const registrationType = url.searchParams.get("type") || "panel";
  if (!new Set(["panel", "hackathon"]).has(registrationType)) return json({ ok: false, error: "Invalid registration type." }, 400);
  const view = url.searchParams.get("view") || "directory";
  if (!new Set(["directory", "summary"]).has(view)) return json({ ok: false, error: "Invalid registration view." }, 400);

  try {
    if (view === "summary") {
      const [panelSummaryResult, hackathonSummaryResult, recentResult] = await context.env.DB.batch([
        context.env.DB.prepare(`SELECT COUNT(*) AS total,
          SUM(CASE WHEN participant_type = 'Student' THEN 1 ELSE 0 END) AS students,
          SUM(CASE WHEN panel_selection = 'Interested in All Panels' THEN 1 ELSE 0 END) AS all_panels
          FROM panel_registrations`),
        context.env.DB.prepare(`SELECT COUNT(*) AS total,
          SUM(CASE WHEN participant_type = 'Student' THEN 1 ELSE 0 END) AS students
          FROM hackathon_registrations`),
        context.env.DB.prepare(`SELECT * FROM (
          SELECT id, name, 'panel' AS registration_type, panel_selection AS activity_label, created_at FROM panel_registrations
          UNION ALL
          SELECT id, name, 'hackathon' AS registration_type, challenge_area || ' · ' || subcategory AS activity_label, created_at FROM hackathon_registrations
        ) ORDER BY datetime(created_at) DESC, id DESC LIMIT 5`),
      ]);
      const panelCounts = panelSummaryResult.results?.[0] || {};
      const hackathonCounts = hackathonSummaryResult.results?.[0] || {};
      const panelTotal = Number(panelCounts.total || 0);
      const hackathonTotal = Number(hackathonCounts.total || 0);
      return json({
        ok: true,
        registrationType,
        view,
        summary: { total: panelTotal + hackathonTotal, panelTotal, hackathonTotal, students: Number(panelCounts.students || 0) + Number(hackathonCounts.students || 0) },
        recent: recentResult.results || [],
      });
    }
    const query = registrationType === "panel"
      ? `SELECT id, name, email, phone, participant_type, organisation, department,
              panel_selection, industry_sector, industry_sector_other,
              organisation_type, organisation_type_other,
              information_confirmed, updates_opt_in, created_at
       FROM panel_registrations
       ORDER BY datetime(created_at) DESC, id DESC`
      : `SELECT id, name, email, phone, participant_type, organisation, tracks,
              challenge_area, subcategory, problem_area, idea_summary,
              information_confirmed, created_at
       FROM hackathon_registrations
       ORDER BY datetime(created_at) DESC, id DESC`;
    const result = await context.env.DB.prepare(query).all();
    return json({ ok: true, registrationType, registrations: result.results || [] });
  } catch (error) {
    console.error(JSON.stringify({ message: "registrations query failed", registrationType, error: error instanceof Error ? error.message : String(error) }));
    return json({ ok: false, error: `Could not load ${registrationType} registrations.` }, 500);
  }
}
