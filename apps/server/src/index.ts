import http from "node:http";

import exitHook from "async-exit-hook";
import chalk from "chalk";

import logger from "@workspace/shared/utils/logger";

import { createApp } from "src/app";
import { ENSURE_BLOOM_FILTERS, REGISTER_BLOOM_RECOVERY } from "src/config/bloom";
import { CLOSE_DB, CONNECT_DB } from "src/config/database";
import environmentConfig from "src/config/environment";
import { ENSURE_INDEXES } from "src/config/indexes";
import { startMetricsServer } from "src/providers/metrics.provider";
import { closeRedisClient } from "src/providers/redis.provider";
import { userQueue } from "src/queues/user/user.queue";
import { startSockets } from "src/sockets";
import { closeSocketAdapter } from "src/sockets/socket.server";

const START_SERVER = async (): Promise<void> => {
  // Create Express app
  const app = createApp();
  const port = environmentConfig.PORT;

  // Start metrics server for Prometheus scraping
  const metricsServer = startMetricsServer(environmentConfig.METRICS_PORT, "Server");

  // Create HTTP server and setup Socket.io
  const server = http.createServer(app);
  const io = await startSockets(server);

  // Start the server
  server.listen(port, () => {
    logger.info(chalk.bgBlueBright(`Server is running at http://localhost:${port}`));
  });

  // Register Bloom filter recovery and ensure Bloom filters are initialized
  REGISTER_BLOOM_RECOVERY();
  void ENSURE_BLOOM_FILTERS();

  // Handle graceful shutdown
  exitHook((done) => {
    void (async () => {
      logger.info("4. Closing metrics server...");
      await new Promise<void>((resolve) => metricsServer.close(() => resolve()));
      logger.info("5. Draining HTTP and Socket.io connections...");
      await Promise.race([
        new Promise<void>((resolve) => io.close(() => resolve())),
        new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
      ]);
      logger.info("6. Closing BullMQ queue...");
      await userQueue.close();
      logger.info("7. Closing Socket.io Redis adapter...");
      await closeSocketAdapter();
      logger.info("8. Closing Redis client...");
      await closeRedisClient();
      logger.info("9. Closing MongoDB connection...");
      await CLOSE_DB();
      logger.info(chalk.bgBlueBright("Shutting down server..."));
      done();
    })();
  });
};

void (async () => {
  try {
    logger.info("1. Connecting to MongoDB Cloud Atlas...");
    await CONNECT_DB();
    logger.info("2. Connected to MongoDB Cloud Atlas!");
    await ENSURE_INDEXES();
    logger.info("3. Starting Express server...");
    await START_SERVER();
  } catch (error) {
    throw new Error(`Failed to start server: ${(error as Error).message}`, { cause: error });
  }
})();
