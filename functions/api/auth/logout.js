import { getSession, isSameOrigin, parseCookies, sessionCookie, SESSION_COOKIE } from "../../_shared/auth.js";

export async function onRequestPost(context) {
  if (!isSameOrigin(context.request)) return new Response(JSON.stringify({ ok: false, error: "This logout request could not be verified." }), { status: 403, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  const session = await getSession(context);
  if (session) await context.env.DB.prepare("DELETE FROM admin_sessions WHERE id = ?").bind(session.id).run();
  const token = parseCookies(context.request)[SESSION_COOKIE];
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": sessionCookie(token || "", 0) } });
}
