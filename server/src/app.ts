import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";

export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} is not allowed by CORS`));
        }
      },
      credentials: true,
    })
  );
  // `verify` stashes the exact raw bytes alongside the parsed body — the Zoom webhook handler
  // needs the untouched raw body to recompute its HMAC signature; re-stringifying req.body
  // wouldn't byte-for-byte match what Zoom actually signed.
  app.use(express.json({ verify: (req, _res, buf) => { (req as express.Request).rawBody = buf; } }));
  app.use(cookieParser());
  // No more `/uploads` static directory — every file lives in S3 and is only ever served via a
  // short-lived signed URL minted by `/api/files/*` or one of the resource-specific signed-URL
  // endpoints (recordings, lesson content, resources).

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api", routes);

  app.use(errorHandler);

  return app;
}
