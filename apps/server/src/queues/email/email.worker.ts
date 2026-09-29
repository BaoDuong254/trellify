import { type Job, Worker } from "bullmq";

import logger from "@workspace/shared/utils/logger";

import environmentConfig from "src/config/environment";
import { EmailJobData } from "src/queues/email/email.interface";
import { processEmailJob } from "src/queues/email/email.processor";
import { QUEUE_NAMES, QUEUE_PREFIX } from "src/queues/queue.constants";
import { createRedisConnection } from "src/queues/redis.client";

export const createEmailWorker = (): Worker<EmailJobData> => {
  const emailWorker = new Worker<EmailJobData>(QUEUE_NAMES.EMAIL, processEmailJob, {
    connection: createRedisConnection(),
    prefix: QUEUE_PREFIX,
    concurrency: environmentConfig.WORKER_CONCURRENCY,
  });

  emailWorker.on("completed", (job: Job<EmailJobData>) => {
    logger.info(`[EmailQueue] Job ${job.id} completed`);
  });

  emailWorker.on("failed", (job: Job<EmailJobData> | undefined, error: Error) => {
    logger.error(`[EmailQueue] Job ${job?.id ?? "unknown"} failed: ${error.message}`);
  });

  emailWorker.on("error", (error: Error) => {
    logger.error(`[EmailQueue] Worker error: ${error.message}`);
  });

  return emailWorker;
};
