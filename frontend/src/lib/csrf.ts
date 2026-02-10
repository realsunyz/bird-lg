const CSRF_COOKIE_NAME = "csrf_";
const CSRF_HEADER_NAME = "X-Csrf-Token";

export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";

  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const cookie of cookies) {
    const [rawKey, ...rest] = cookie.split("=");
    if (!rawKey || rest.length === 0) continue;

    const key = rawKey.trim();
    if (key !== CSRF_COOKIE_NAME) continue;

    return decodeURIComponent(rest.join("=").trim());
  }

  return "";
}

export function buildPostJSONHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getCsrfToken();
  if (token) {
    headers[CSRF_HEADER_NAME] = token;
  }

  return headers;
}
