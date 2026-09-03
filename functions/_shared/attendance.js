import { constantTimeEqual, isSameOrigin, newToken, parseCookies, readJsonBody, sessionCookie, sha256 } from "./auth.js";

const DEFAULT_ATTENDANCE_PASSWORD = "aiconclaveattend754#";
const ATTENDANCE_COOKIE = "__Host-aiconclave_attendance_session";
const ATTENDANCE_TTL_SECONDS = 60 * 60 * 12;

function attendanceCookie(token, maxAge = ATTENDANCE_TTL_SECONDS) {
  return `${ATTENDANCE_COOKIE}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function attendanceJson(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}

export async function getAttendanceSession(context) {
  const token = parseCookies(context.request)[ATTENDANCE_COOKIE];
  if (!token || !context.env?.DB) return null;
  const tokenHash = await sha256(token);
  return context.env.DB.prepare("SELECT id, expires_at FROM attendance_sessions WHERE token_hash = ? AND expires_at > datetime('now')").bind(tokenHash).first();
}

export async function requireAttendanceSession(context) {
  const session = await getAttendanceSession(context);
  if (!session) return { response: attendanceJson({ ok: false, error: "Attendance authentication required." }, 401) };
  return { session };
}

export async function handleAttendanceAuth(context) {
  if (context.request.method === "GET") {
    const session = await getAttendanceSession(context);
    return session ? attendanceJson({ ok: true }) : attendanceJson({ ok: false }, 401);
  }
  if (!isSameOrigin(context.request)) return attendanceJson({ ok: false, error: "This sign-in request could not be verified." }, 403);
  if (context.request.method === "DELETE") {
    const token = parseCookies(context.request)[ATTENDANCE_COOKIE];
    if (token) await context.env.DB.prepare("DELETE FROM attendance_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
    return attendanceJson({ ok: true }, 200, { "set-cookie": attendanceCookie("", 0) });
  }
  let body;
  try { body = await readJsonBody(context.request); } catch { return attendanceJson({ ok: false, error: "Invalid request." }, 400); }
  const password = typeof body?.password === "string" ? body.password : "";
  if (!(await constantTimeEqual(password, context.env.ATTENDANCE_PASSWORD || DEFAULT_ATTENDANCE_PASSWORD))) return attendanceJson({ ok: false, error: "Invalid attendance password." }, 401);
  const token = newToken();
  await context.env.DB.prepare("INSERT INTO attendance_sessions (token_hash, expires_at) VALUES (?, datetime('now', '+12 hours'))").bind(await sha256(token)).run();
  await context.env.DB.prepare("DELETE FROM attendance_sessions WHERE expires_at <= datetime('now')").run();
  return attendanceJson({ ok: true }, 200, { "set-cookie": attendanceCookie(token) });
}
