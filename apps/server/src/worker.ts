import exitHook from "async-exit-hook";
import chalk from "chalk";

import logger from "@workspace/shared/utils/logger";

import { CLOSE_DB, CONNECT_DB } from "src/config/database";
import environmentConfig from "src/config/environment";
import { createUserWorker } from "src/queues/user/user.worker";

const START_WORKER = () => {
  const userWorker = createUserWorker();

  logger.info(chalk.bgBlueBright(`Worker is running with concurrency=${environmentConfig.WORKER_CONCURRENCY}`));

  // Handle graceful shutdown
  exitHook((done) => {
    void (async () => {
      logger.info("4. Closing BullMQ worker...");
      await userWorker.close();
      logger.info("5. Closing MongoDB Cloud Atlas connection...");
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
