class DashboardApiError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.name = "DashboardApiError";
    this.status = status;
    this.code = details.code || "";
    this.fields = details.fields || {};
  }
}

async function requestJson(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new DashboardApiError("Network error. Please try again.", 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new DashboardApiError(
      data.error || "The request could not be completed.",
      response.status,
      data,
    );
  }
  return data;
}

export const authApi = {
  currentUser: () => requestJson("/api/auth/me"),
  login: (username, password) =>
    requestJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    }),
  logout: () => requestJson("/api/auth/logout", { method: "POST" }),
};

export const registrationsApi = {
  summary: () => requestJson("/api/registrations?type=panel&view=summary"),
  list: (registrationType) =>
    requestJson(
      `/api/registrations?type=${encodeURIComponent(registrationType)}`,
    ),
  remove: (registrationType, id, recordType) =>
    requestJson(
      `/api/registrations/${encodeURIComponent(id)}?type=${encodeURIComponent(registrationType)}&record_type=${encodeURIComponent(recordType || registrationType)}`,
      { method: "DELETE" },
    ),
  update: (registrationType, id, recordType, payload) =>
    requestJson(
      `/api/registrations/${encodeURIComponent(id)}?type=${encodeURIComponent(registrationType)}&record_type=${encodeURIComponent(recordType || registrationType)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
};

export const attendanceApi = {
  login: (password) => requestJson("/api/attendance/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  }),
  currentSession: () => requestJson("/api/attendance/auth"),
  logout: () => requestJson("/api/attendance/auth", { method: "DELETE" }),
  teams: (query = "", date = new Date().toISOString().slice(0, 10)) => requestJson(`/api/attendance/teams?q=${encodeURIComponent(query)}&date=${encodeURIComponent(date)}`),
  team: (id, date) => requestJson(`/api/attendance/teams/${encodeURIComponent(id)}?date=${encodeURIComponent(date)}`),
  saveAttendance: (id, date, attendance) => requestJson(`/api/attendance/teams/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ date, attendance }),
  }),
  changeLead: (id, memberId) => requestJson(`/api/attendance/teams/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ leadMemberId: memberId }),
  }),
  exportData: () => requestJson("/api/attendance/export"),
};

export function isUnauthorized(error) {
  return error instanceof DashboardApiError && error.status === 401;
}
