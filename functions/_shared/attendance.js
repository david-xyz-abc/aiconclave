import { constantTimeEqual, hashPassword, isSameOrigin, newToken, parseCookies, readJsonBody, sessionCookie, sha256 } from "./auth.js";

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
  return context.env.DB.prepare("SELECT s.id, s.expires_at, u.username, u.role FROM attendance_sessions s JOIN admin_users u ON u.id = s.admin_user_id WHERE s.token_hash = ? AND s.expires_at > datetime('now')").bind(tokenHash).first();
}

export async function requireAttendanceSession(context) {
  const session = await getAttendanceSession(context);
  if (!session) return { response: attendanceJson({ ok: false, error: "Attendance authentication required." }, 401) };
  return { session };
}

export async function requireAttendanceAdmin(context) {
  const auth = await requireAttendanceSession(context);
  if (auth.response) return auth;
  if (auth.session.role !== "admin") return { response: attendanceJson({ ok: false, error: "Administrator access is required." }, 403) };
  return auth;
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
  const username = typeof body?.username === "string" ? body.username.trim().slice(0, 80) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) return attendanceJson({ ok: false, error: "Username and password are required." }, 400);
  const user = await context.env.DB.prepare("SELECT id, username, password_hash, password_salt, password_iterations, role FROM admin_users WHERE username = ?").bind(username).first();
  if (!user) return attendanceJson({ ok: false, error: "Invalid username or password." }, 401);
  let passwordHash;
  try { passwordHash = await hashPassword(password, user.password_salt, user.password_iterations); } catch { return attendanceJson({ ok: false, error: "Invalid username or password." }, 401); }
  if (!(await constantTimeEqual(passwordHash, user.password_hash))) return attendanceJson({ ok: false, error: "Invalid username or password." }, 401);
  const token = newToken();
  await context.env.DB.prepare("INSERT INTO attendance_sessions (admin_user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+12 hours'))").bind(user.id, await sha256(token)).run();
  await context.env.DB.prepare("DELETE FROM attendance_sessions WHERE expires_at <= datetime('now')").run();
  return attendanceJson({ ok: true, user: { username: user.username, role: user.role || "admin" } }, 200, { "set-cookie": attendanceCookie(token) });
}
