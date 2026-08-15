import { getSession } from "../_shared/auth.js";

export async function onRequestGet(context) {
  const session = await getSession(context);
  if (!session) return new Response(JSON.stringify({ ok: false, error: "Authentication required." }), { status: 401, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  const result = await context.env.DB.prepare(
    `SELECT id, name, email, phone, organisation, category, tracks, created_at
     FROM registrations ORDER BY datetime(created_at) DESC, id DESC`,
  ).all();
  return new Response(JSON.stringify({ ok: true, registrations: result.results || [] }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
