import { getSession, isSameOrigin } from "../../_shared/auth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestDelete(context) {
  if (!isSameOrigin(context.request)) return json({ ok: false, error: "This delete request could not be verified." }, 403);
  const session = await getSession(context);
  if (!session) return json({ ok: false, error: "Authentication required." }, 401);

  const registrationType = new URL(context.request.url).searchParams.get("type") || "panel";
  if (!new Set(["panel", "hackathon"]).has(registrationType)) return json({ ok: false, error: "Invalid registration type." }, 400);

  const id = Number.parseInt(context.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return json({ ok: false, error: "Invalid registration id." }, 400);

  try {
    const table = registrationType === "panel" ? "panel_registrations" : "hackathon_registrations";
    const result = await context.env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
    if (!result?.meta?.changes) return json({ ok: false, error: "Registration not found." }, 404);
    return json({ ok: true, id, registrationType });
  } catch (error) {
    console.error(JSON.stringify({ message: "registration delete failed", registrationType, registrationId: id, error: error instanceof Error ? error.message : String(error) }));
    return json({ ok: false, error: "Could not delete registration." }, 500);
  }
}
