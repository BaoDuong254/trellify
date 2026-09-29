import { Queue } from "bullmq";

import logger from "@workspace/shared/utils/logger";

import { EmailJobData } from "src/queues/email/email.interface";
import { QUEUE_NAMES, QUEUE_PREFIX } from "src/queues/queue.constants";
import { createRedisConnection } from "src/queues/redis.client";

const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
  connection: createRedisConnection(),
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

emailQueue.on("error", (error: Error) => {
  logger.error(`[EmailQueue] Queue error: ${error.message}`);
});

export const enqueueEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    await emailQueue.add("send-email", { kind: "send-email", to, subject, html });
  } catch (error) {
    logger.warn(`[EmailQueue] Email to ${to} not queued: ${(error as Error).message}`);
  }
};

export const scheduleDueReminder = async (cardId: string, dueDate: Date, now = Date.now()): Promise<void> => {
  const dueTs = dueDate.getTime();
  if (dueTs <= now) return;

  try {
    await emailQueue.add(
      "due-reminder",
      { kind: "due-reminder", cardId, dueTs },
      { jobId: `due-${cardId}-${dueTs}`, delay: Math.max(0, dueTs - REMINDER_LEAD_MS - now) }
    );
  } catch (error) {
    logger.warn(`[EmailQueue] Due reminder for card ${cardId} not queued: ${(error as Error).message}`);
  }
};
