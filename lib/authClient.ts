const TOKEN_KEY = "incrito:accessToken";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: "POST", credentials: "include" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) return null;
    setAccessToken(body.data.accessToken);
    return body.data.accessToken as string;
  } catch {
    return null;
  }
}

type ApiFetchOptions = RequestInit & { skipAuth?: boolean };

/**
 * fetch() wrapper that attaches the access token, retries once via /api/auth/refresh on a 401
 * (access tokens are short-lived by design — see auth.service.ts), and always sends the
 * httpOnly refresh cookie.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  function withToken(token: string | null) {
    if (token && !options.skipAuth) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: withToken(getAccessToken()),
    credentials: "include",
  });

  if (response.status === 401 && !options.skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: withToken(newToken),
        credentials: "include",
      });
    }
  }

  return response;
}

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string; details?: unknown };

/** apiFetch + JSON parsing, normalized to the server's { success, data | message, details } shape. */
export async function apiJson<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await apiFetch(path, options);
  } catch {
    return { ok: false, status: 0, message: "Could not reach the server. Check your connection and try again." };
  }

  // 204 No Content has no body — treat as success directly
  if (response.status === 204) {
    return { ok: true, status: 204, data: null as T };
  }

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    return {
      ok: false,
      status: response.status,
      message: body?.message ?? "Request failed",
      details: body?.details,
    };
  }

  return { ok: true, status: response.status, data: body.data as T };
}
