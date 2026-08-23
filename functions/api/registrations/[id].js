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
  if (!isSameOrigin(context.request))
    return json(
      { ok: false, error: "This delete request could not be verified." },
      403,
    );
  const session = await getSession(context);
  if (!session)
    return json({ ok: false, error: "Authentication required." }, 401);

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

  const id = Number.parseInt(context.params.id, 10);
  if (!Number.isInteger(id) || id < 1)
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
