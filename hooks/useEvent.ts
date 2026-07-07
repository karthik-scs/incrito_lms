"use client";

import { useEffect, useCallback } from "react";
import { onStreamEvent } from "@/lib/eventStream";

/**
 * Subscribe to a real-time SSE event type for the lifetime of the component.
 *
 * Usage:
 *   useEvent("notification", refetchNotifications);
 *   useEvent("progress", () => router.refresh());
 *
 * The handler is stable-wrapped so callers can pass inline arrow functions
 * without worrying about re-subscription on every render.
 */
export function useEvent(
  type: string,
  handler: (data: Record<string, unknown>) => void,
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableHandler = useCallback(handler, []);

  useEffect(() => {
    return onStreamEvent(type, stableHandler);
  }, [type, stableHandler]);
}
