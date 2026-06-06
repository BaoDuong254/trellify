import { type Job, type Processor, Queue, Worker } from "bullmq";

import logger from "@workspace/shared/utils/logger";

import { userModel } from "src/models/user.model";
import { createRedisConnection } from "src/queues/redis.client";

export const QUEUE_NAMES = {
  DELETE_UNVERIFIED_USER: "delete-unverified-user",
} as const;

export interface DeleteUnverifiedUserJobData {
  userId: string;
}

export const userQueue = new Queue<DeleteUnverifiedUserJobData>(QUEUE_NAMES.DELETE_UNVERIFIED_USER, {
  connection: createRedisConnection(),
});

const processDeleteUnverifiedUser: Processor<DeleteUnverifiedUserJobData> = async (
  job: Job<DeleteUnverifiedUserJobData>
): Promise<void> => {
  const { userId } = job.data;
  const user = await userModel.findOneById(userId);

  if (!user || user.isActive) {
    logger.info(`[UserQueue] Skipping deletion userId=${userId}: already verified or not found`);
    return;
  }

  await userModel.hardDeleteById(userId);
  logger.info(`[UserQueue] Hard-deleted unverified account userId=${userId}`);
};

export const userWorker = new Worker<DeleteUnverifiedUserJobData>(
  QUEUE_NAMES.DELETE_UNVERIFIED_USER,
  processDeleteUnverifiedUser,
  { connection: createRedisConnection() }
);

userQueue.on("error", (error: Error) => {
  logger.error(`[UserQueue] Queue error: ${error.message}`);
});

userWorker.on("completed", (job: Job<DeleteUnverifiedUserJobData>) => {
  logger.info(`[UserQueue] Job ${job.id} completed`);
});

userWorker.on("failed", (job: Job<DeleteUnverifiedUserJobData> | undefined, error: Error) => {
  logger.error(`[UserQueue] Job ${job?.id ?? "unknown"} failed: ${error.message}`);
});

userWorker.on("error", (error: Error) => {
  logger.error(`[UserQueue] Worker error: ${error.message}`);
});
