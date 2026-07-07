/**
 * Server-Sent Events connection registry.
 *
 * Each authenticated user can have multiple open connections (multiple tabs).
 * The registry is in-process — fine for single-instance PM2 fork mode.
 * If the app ever moves to cluster/multi-process, replace this with a Redis pub/sub fan-out.
 */

import type { Response } from "express";

// userId → set of active SSE response objects
const connections = new Map<string, Set<Response>>();

/** Register an SSE connection. Returns a cleanup function to call on disconnect. */
export function addSseConnection(userId: string, res: Response): () => void {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId)!.add(res);

  return () => {
    const set = connections.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) connections.delete(userId);
  };
}

/** Push a typed event to all open connections for a single user. */
export function emitToUser(userId: string, event: string, data: unknown = {}): void {
  const set = connections.get(userId);
  if (!set?.size) return;
  const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(chunk);
    } catch {
      set.delete(res);
    }
  }
}

/** Push a typed event to multiple users at once. */
export function emitToUsers(userIds: string[], event: string, data: unknown = {}): void {
  for (const id of userIds) emitToUser(id, event, data);
}

/** How many users currently have an open SSE connection (for monitoring). */
export function activeSseConnections(): number {
  let count = 0;
  for (const set of connections.values()) count += set.size;
  return count;
}
