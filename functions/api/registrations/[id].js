import { getSession } from "../../_shared/auth.js";

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
  const session = await getSession(context);
  if (!session) return json({ ok: false, error: "Authentication required." }, 401);

  const registrationType = new URL(context.request.url).searchParams.get("type") || "panel";
  if (registrationType !== "panel") return json({ ok: false, error: "This registration section is not available yet." }, 400);

  const id = Number.parseInt(context.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return json({ ok: false, error: "Invalid registration id." }, 400);

  try {
    const result = await context.env.DB.prepare("DELETE FROM panel_registrations WHERE id = ?").bind(id).run();
    if (!result?.meta?.changes) return json({ ok: false, error: "Panel registration not found." }, 404);
    return json({ ok: true, id, registrationType });
  } catch (error) {
    console.error(JSON.stringify({ message: "panel registration delete failed", registrationId: id, error: error instanceof Error ? error.message : String(error) }));
    return json({ ok: false, error: "Could not delete panel registration." }, 500);
  }
}
