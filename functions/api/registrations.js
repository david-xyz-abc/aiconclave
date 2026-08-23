import { getSession } from "../_shared/auth.js";
import {
  getRegistrationTables,
  loadHackathonRegistrations,
  loadPanelRegistrations,
  loadRegistrationSummary,
} from "../_shared/registrations.js";

const REGISTRATION_TYPES = new Set(["panel", "hackathon"]);
const REGISTRATION_VIEWS = new Set(["directory", "summary"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestGet(context) {
  const session = await getSession(context);
  if (!session)
    return json({ ok: false, error: "Authentication required." }, 401);
  if (!context.env?.DB)
    return json(
      { ok: false, error: "Registration database is unavailable." },
      503,
    );

  const url = new URL(context.request.url);
  const registrationType = url.searchParams.get("type") || "panel";
  const view = url.searchParams.get("view") || "directory";
  if (!REGISTRATION_TYPES.has(registrationType))
    return json({ ok: false, error: "Invalid registration type." }, 400);
  if (!REGISTRATION_VIEWS.has(view))
    return json({ ok: false, error: "Invalid registration view." }, 400);

  try {
    const tables = await getRegistrationTables(context.env.DB);
    if (view === "summary") {
      const summary = await loadRegistrationSummary(context.env.DB, tables);
      return json({ ok: true, registrationType, view, ...summary });
    }
    const registrations =
      registrationType === "panel"
        ? await loadPanelRegistrations(context.env.DB, tables)
        : await loadHackathonRegistrations(context.env.DB, tables);
    return json({ ok: true, registrationType, registrations });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "dashboard_registrations_query_failed",
        registrationType,
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    return json(
      { ok: false, error: `Could not load ${registrationType} registrations.` },
      500,
    );
  }
}
