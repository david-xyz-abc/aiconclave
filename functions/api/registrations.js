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
  if (registrationType !== "panel") return json({ ok: false, error: "This registration section is not available yet." }, 400);
  const view = url.searchParams.get("view") || "directory";
  if (!new Set(["directory", "summary"]).has(view)) return json({ ok: false, error: "Invalid registration view." }, 400);

  try {
    if (view === "summary") {
      const [summaryResult, recentResult] = await context.env.DB.batch([
        context.env.DB.prepare(`SELECT COUNT(*) AS total,
          SUM(CASE WHEN participant_type = 'Student' THEN 1 ELSE 0 END) AS students,
          SUM(CASE WHEN panel_selection = 'Interested in All Panels' THEN 1 ELSE 0 END) AS all_panels
          FROM panel_registrations`),
        context.env.DB.prepare(`SELECT id, name, panel_selection, created_at
          FROM panel_registrations ORDER BY datetime(created_at) DESC, id DESC LIMIT 5`),
      ]);
      const counts = summaryResult.results?.[0] || {};
      return json({
        ok: true,
        registrationType,
        view,
        summary: { total: Number(counts.total || 0), students: Number(counts.students || 0), allPanels: Number(counts.all_panels || 0) },
        recent: recentResult.results || [],
      });
    }
    const result = await context.env.DB.prepare(
      `SELECT id, name, email, phone, participant_type, organisation, department,
              panel_selection, industry_sector, industry_sector_other,
              organisation_type, organisation_type_other,
              information_confirmed, updates_opt_in, created_at
       FROM panel_registrations
       ORDER BY datetime(created_at) DESC, id DESC`,
    ).all();
    return json({ ok: true, registrationType, registrations: result.results || [] });
  } catch (error) {
    console.error(JSON.stringify({ message: "panel registrations query failed", error: error instanceof Error ? error.message : String(error) }));
    return json({ ok: false, error: "Could not load panel registrations." }, 500);
  }
}
