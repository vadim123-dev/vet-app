const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export function getAccessToken() {
  return localStorage.getItem("access_token");
}
export function setAccessToken(token) {
  localStorage.setItem("access_token", token);
}
export function setRefreshToken(token) {
  localStorage.setItem("refresh_token", token);
}
export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function apiFetch(path, { method = "GET", body, headers } = {}) {
  const token = getAccessToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = typeof data === "string" ? data : data?.error || data?.message || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.responseData = typeof data === "object" ? data : null;
    throw err;
  }

  return data;
}
