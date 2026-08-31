import { getSession } from "../../_shared/auth.js";

export async function onRequestGet(context) {
  const session = await getSession(context);
  if (!session)
    return new Response(JSON.stringify({ ok: false }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  return new Response(
    JSON.stringify({ ok: true, user: { username: session.username, role: session.role } }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );
}
