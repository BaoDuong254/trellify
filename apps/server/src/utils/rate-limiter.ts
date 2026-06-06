import { StatusCodes } from "http-status-codes";

import { getRedisClient } from "src/providers/redis.provider";
import ApiError from "src/utils/api-error";

export const checkRateLimit = async (key: string, limit: number, windowSec: number): Promise<void> => {
  const client = getRedisClient();
  const current = await client.incr(key);
  if (current === 1) {
    await client.expire(key, windowSec);
  }
  if (current > limit) {
    throw new ApiError(StatusCodes.TOO_MANY_REQUESTS, "Too many requests. Please try again later.");
  }
};
