type FlowKey = "verify-otp" | "reset-password";

const FLOW_TTL_MS = 15 * 60 * 1000;

function storageKey(flow: FlowKey) {
  return `incrito:flow:${flow}`;
}

/** Call right before redirecting a user into a flow-gated page (verify-otp / reset-password). */
export function markFlowEntry(flow: FlowKey, email: string) {
  sessionStorage.setItem(storageKey(flow), JSON.stringify({ email, exp: Date.now() + FLOW_TTL_MS }));
}

/** Call once the flow-gated page's purpose is fulfilled (e.g. verification succeeded). */
export function consumeFlowEntry(flow: FlowKey) {
  sessionStorage.removeItem(storageKey(flow));
}

/**
 * Whether this tab legitimately navigated into `flow` for `email` — set by markFlowEntry on the
 * page before it. Prevents reaching verify-otp/reset-password by typing the URL directly: there's
 * no prior in-app step to have set the flag, so the check fails and the page redirects back.
 */
export function hasValidFlowEntry(flow: FlowKey, email: string): boolean {
  if (typeof window === "undefined" || !email) return false;
  const raw = sessionStorage.getItem(storageKey(flow));
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as { email: string; exp: number };
    return data.email === email && data.exp > Date.now();
  } catch {
    return false;
  }
}
