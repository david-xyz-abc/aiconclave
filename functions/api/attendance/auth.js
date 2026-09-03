import { handleAttendanceAuth } from "../../_shared/attendance.js";

export async function onRequest(context) {
  return handleAttendanceAuth(context);
}
