import { type Job, type Processor } from "bullmq";

import logger from "@workspace/shared/utils/logger";

import { userModel } from "src/models/user.model";
import { DeleteUnverifiedUserJobData } from "src/queues/user/user.interface";

export const processDeleteUnverifiedUser: Processor<DeleteUnverifiedUserJobData> = async (
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
