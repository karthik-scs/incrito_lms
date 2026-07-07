/**
 * Lightweight in-browser event bus for Server-Sent Events.
 *
 * The EventStreamProvider (components/providers/EventStreamProvider.tsx) opens one
 * EventSource connection per session, parses incoming events, and calls `_emit`.
 * Components subscribe with `onStreamEvent(type, handler)` — the returned function
 * unsubscribes and is meant to be returned from a `useEffect`.
 *
 * Supported event types (mirrors what the server emits):
 *   notification       — a new notification was created for this user
 *   progress           — this user completed a lesson (roadmap / dashboard stats update)
 *   live_class         — a live class changed status (LIVE / COMPLETED)
 *   hls_ready          — HLS encryption finished for a lesson; player should switch to HLS
 *   enrollment         — an enrollment was created or updated for this user
 *   discussion_update  — a new comment was added to a cohort discussion or community post
 *                        payload: { postId, cohortId? } | { postId, communityId? }
 */

type Handler = (data: Record<string, unknown>) => void;

const listeners = new Map<string, Set<Handler>>();

/** Subscribe to an event type. Returns an unsubscribe function. */
export function onStreamEvent(type: string, handler: Handler): () => void {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(handler);
  return () => listeners.get(type)?.delete(handler);
}

/** Called by EventStreamProvider — do not call directly from components. */
export function _emit(type: string, data: Record<string, unknown>): void {
  listeners.get(type)?.forEach((h) => {
    try { h(data); } catch { /* never crash the SSE pipeline */ }
  });
}
