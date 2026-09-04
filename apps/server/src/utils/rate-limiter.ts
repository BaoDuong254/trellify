import { StatusCodes } from "http-status-codes";

import logger from "@workspace/shared/utils/logger";

import { getRedisClient } from "src/providers/redis.provider";
import ApiError from "src/utils/api-error";

const CONSUME_SCRIPT = `
local count = redis.call("incr", KEYS[1])
if count == 1 then
  redis.call("expire", KEYS[1], ARGV[1])
end
return count
`;

export const checkRateLimit = async (key: string, limit: number, windowSec: number): Promise<void> => {
  let current: number;

  try {
    current = Number(await getRedisClient().eval(CONSUME_SCRIPT, 1, key, windowSec));
  } catch (error) {
    logger.warn(`Rate limit for ${key} not enforced, Redis is unavailable: ${(error as Error).message}`);
    return;
  }

  if (current > limit) {
    throw new ApiError(StatusCodes.TOO_MANY_REQUESTS, "Too many requests. Please try again later.");
  }
};
