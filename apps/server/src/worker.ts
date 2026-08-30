import http from "node:http";

import exitHook from "async-exit-hook";
import chalk from "chalk";

import logger from "@workspace/shared/utils/logger";

import { CLOSE_DB, CONNECT_DB } from "src/config/database";
import environmentConfig from "src/config/environment";
import { startMetricsServer, workerJobDuration } from "src/providers/metrics.provider";
import { createUserWorker } from "src/queues/user/user.worker";

const START_WORKER = (): void => {
  const userWorker = createUserWorker();

  const healthServer = http.createServer((request, response) => {
    if (request.url !== "/healthz") {
      response.writeHead(404).end();
      return;
    }
    const isHealthy = userWorker.isRunning() && !userWorker.isPaused();
    response.writeHead(isHealthy ? 200 : 503, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ status: isHealthy ? "ok" : "degraded" }));
  });
  healthServer.listen(environmentConfig.WORKER_HEALTH_PORT);

  const metricsServer = startMetricsServer(environmentConfig.METRICS_PORT, "Worker");

  userWorker.on("completed", (job) => {
    workerJobDuration.observe(
      { job: job.name, outcome: "completed" },
      job.finishedOn ? (job.finishedOn - job.processedOn!) / 1000 : 0
    );
  });
  userWorker.on("failed", (job) => {
    if (!job) return;
    workerJobDuration.observe(
      { job: job.name, outcome: "failed" },
      job.finishedOn ? (job.finishedOn - job.processedOn!) / 1000 : 0
    );
  });

  logger.info(chalk.bgBlueBright(`Worker is running with concurrency=${environmentConfig.WORKER_CONCURRENCY}`));
  logger.info(`Health endpoint listening on :${environmentConfig.WORKER_HEALTH_PORT}/healthz`);

  // Handle graceful shutdown
  exitHook((done) => {
    void (async () => {
      logger.info("4. Closing health and metrics endpoints...");
      await new Promise<void>((resolve) => healthServer.close(() => resolve()));
      await new Promise<void>((resolve) => metricsServer.close(() => resolve()));
      logger.info("5. Closing BullMQ worker...");
      await userWorker.close();
      logger.info("6. Closing MongoDB connection...");
      await CLOSE_DB();
      logger.info(chalk.bgBlueBright("Shutting down worker..."));
      done();
    })();
  });
};

void (async () => {
  try {
    logger.info("1. Connecting to MongoDB Cloud Atlas...");
    await CONNECT_DB();
    logger.info("2. Connected to MongoDB Cloud Atlas!");
    logger.info("3. Starting BullMQ worker...");
    START_WORKER();
  } catch (error) {
    throw new Error(`Failed to start worker: ${(error as Error).message}`, { cause: error });
  }
})();
