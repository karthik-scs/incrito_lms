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
  app.use(express.json());
  app.use(cookieParser());
  // No more `/uploads` static directory — every file lives in S3 and is only ever served via a
  // short-lived signed URL minted by `/api/files/*` or one of the resource-specific signed-URL
  // endpoints (recordings, lesson content, resources).

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api", routes);

  app.use(errorHandler);

  return app;
}
