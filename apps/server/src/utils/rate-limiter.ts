import { StatusCodes } from "http-status-codes";

import logger from "@workspace/shared/utils/logger";

import { rateLimitDecisions } from "src/providers/metrics.provider";
import { getRedisClient } from "src/providers/redis.provider";
import ApiError from "src/utils/api-error";

const CONSUME_SCRIPT = `
local count = redis.call("incr", KEYS[1])
if count == 1 then
  redis.call("expire", KEYS[1], ARGV[1])
end
return count
`;

export const checkRateLimit = async (
  key: string,
  limit: number,
  windowSec: number,
  bucket = "default"
): Promise<void> => {
  let current: number;

  try {
    current = Number(await getRedisClient().eval(CONSUME_SCRIPT, 1, key, windowSec));
  } catch (error) {
    logger.warn(`Rate limit for ${key} not enforced, Redis is unavailable: ${(error as Error).message}`);
    rateLimitDecisions.inc({ bucket, result: "unavailable" });
    return;
  }

  if (current > limit) {
    rateLimitDecisions.inc({ bucket, result: "limited" });
    throw new ApiError(StatusCodes.TOO_MANY_REQUESTS, "Too many requests. Please try again later.");
  }

  rateLimitDecisions.inc({ bucket, result: "allowed" });
};
