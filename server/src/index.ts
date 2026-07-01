import { createApp } from "./app";
import { env } from "./config/env";
import { redis } from "./lib/redis";
import { logger } from "./lib/logger";

async function main() {
  await redis.connect().catch((err) => {
    logger.warn("Could not connect to Redis on startup, will retry lazily", { message: err.message });
  });

  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info(`incrito LMS API listening on port ${env.PORT}`);
  });
}

main();
