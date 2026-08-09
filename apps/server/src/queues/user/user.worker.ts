import { type Job, Worker } from "bullmq";

import logger from "@workspace/shared/utils/logger";

import environmentConfig from "src/config/environment";
import { QUEUE_NAMES, QUEUE_PREFIX } from "src/queues/queue.constants";
import { createRedisConnection } from "src/queues/redis.client";
import { DeleteUnverifiedUserJobData } from "src/queues/user/user.interface";
import { processDeleteUnverifiedUser } from "src/queues/user/user.processor";

export const createUserWorker = (): Worker<DeleteUnverifiedUserJobData> => {
  const userWorker = new Worker<DeleteUnverifiedUserJobData>(
    QUEUE_NAMES.DELETE_UNVERIFIED_USER,
    processDeleteUnverifiedUser,
    {
      connection: createRedisConnection(),
      prefix: QUEUE_PREFIX,
      concurrency: environmentConfig.WORKER_CONCURRENCY,
    }
  );

  userWorker.on("completed", (job: Job<DeleteUnverifiedUserJobData>) => {
    logger.info(`[UserQueue] Job ${job.id} completed`);
  });

  userWorker.on("failed", (job: Job<DeleteUnverifiedUserJobData> | undefined, error: Error) => {
    logger.error(`[UserQueue] Job ${job?.id ?? "unknown"} failed: ${error.message}`);
  });

  userWorker.on("error", (error: Error) => {
    logger.error(`[UserQueue] Worker error: ${error.message}`);
  });

  return userWorker;
};
