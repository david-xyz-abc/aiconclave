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

  const id = Number.parseInt(context.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return json({ ok: false, error: "Invalid registration id." }, 400);

  const result = await context.env.DB.prepare("DELETE FROM registrations WHERE id = ?").bind(id).run();
  if (!result?.meta?.changes) return json({ ok: false, error: "Registration not found." }, 404);
  return json({ ok: true, id });
}
