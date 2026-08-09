import { Queue } from "bullmq";

import logger from "@workspace/shared/utils/logger";

import { QUEUE_NAMES, QUEUE_PREFIX } from "src/queues/queue.constants";
import { createRedisConnection } from "src/queues/redis.client";
import { DeleteUnverifiedUserJobData } from "src/queues/user/user.interface";

export const userQueue = new Queue<DeleteUnverifiedUserJobData>(QUEUE_NAMES.DELETE_UNVERIFIED_USER, {
  connection: createRedisConnection(),
  prefix: QUEUE_PREFIX,
});

userQueue.on("error", (error: Error) => {
  logger.error(`[UserQueue] Queue error: ${error.message}`);
});
