export async function api(path, body) {
  let response;
  try {
    response = await fetch(
      "/api/" + path,
      body
        ? {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : undefined,
    );
  } catch {
    throw new Error(
      "Could not connect. Your unsaved changes are still on this screen. Please try again.",
    );
  }
  const data = await response.json();
  if (!response.ok || !data.ok) {
    const error = new Error(data.error || "Please sign in again.");
    error.status = response.status;
    throw error;
  }
  return data;
}
