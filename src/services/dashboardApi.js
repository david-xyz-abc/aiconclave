class DashboardApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "DashboardApiError";
    this.status = status;
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
};

export function isUnauthorized(error) {
  return error instanceof DashboardApiError && error.status === 401;
}
