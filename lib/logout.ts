import { apiFetch, clearAccessToken } from "./authClient";

/** Calls the logout endpoint then redirects to /login, regardless of whether the request itself succeeds. */
export async function logout() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch (err) {
    console.error("Logout request failed", err);
  } finally {
    clearAccessToken();
    window.location.href = "/login";
  }
}
