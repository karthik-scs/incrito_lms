"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { getAccessToken, refreshAccessToken } from "@/lib/authClient";
import { _emit } from "@/lib/eventStream";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Opens one SSE connection per authenticated session and feeds events into the
 * shared event bus (lib/eventStream.ts). Components subscribe with useEvent().
 *
 * Reconnection strategy:
 *  - On any error, wait 5 s, refresh the access token (in case it expired), reconnect.
 *  - On logout (user becomes null), close the connection permanently.
 */
export function EventStreamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      // Logged out — close any open connection.
      esRef.current?.close();
      esRef.current = null;
      if (retryRef.current) clearTimeout(retryRef.current);
      return;
    }

    let cancelled = false;

    async function connect() {
      if (cancelled) return;

      const token = getAccessToken();
      if (!token) return;

      const url = `${API_BASE}/api/events/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      const KNOWN_EVENTS = ["notification", "progress", "live_class", "hls_ready", "enrollment"];
      for (const type of KNOWN_EVENTS) {
        es.addEventListener(type, (e: MessageEvent) => {
          try {
            _emit(type, JSON.parse(e.data));
          } catch {
            _emit(type, {});
          }
        });
      }

      es.onerror = async () => {
        es.close();
        esRef.current = null;
        if (cancelled) return;
        // Refresh the token in case it expired, then reconnect after 5 s.
        await refreshAccessToken().catch(() => null);
        retryRef.current = setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [user]);

  return <>{children}</>;
}
