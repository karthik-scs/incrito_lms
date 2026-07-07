import type { Request, Response } from "express";
import { addSseConnection } from "../services/sse.service";

/**
 * GET /api/events/stream?token=ACCESS_TOKEN
 *
 * Keeps the HTTP connection open and streams typed SSE events to the client.
 * Auth is handled by the standard `authenticate` middleware via ?token= query param
 * (EventSource cannot set Authorization headers).
 *
 * Nginx note: X-Accel-Buffering: no disables proxy buffering so events arrive immediately.
 */
export function stream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Tell the client it's connected.
  res.write(": connected\n\n");

  const userId = req.user!.id;
  const cleanup = addSseConnection(userId, res);

  // Heartbeat every 25 s keeps the connection alive through proxies and load balancers
  // that close idle connections after 30 s.
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    cleanup();
  });
}
