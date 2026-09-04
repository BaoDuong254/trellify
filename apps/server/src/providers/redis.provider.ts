import Redis from "ioredis";

import logger from "@workspace/shared/utils/logger";

import environmentConfig from "src/config/environment";

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(environmentConfig.REDIS_URL, {
      commandTimeout: environmentConfig.REDIS_COMMAND_TIMEOUT_MS,
    });
    redisClient.on("error", (error: Error) => {
      logger.warn(`Redis client error: ${error.message}`);
    });
  }
  return redisClient;
};

export const closeRedisClient = async (): Promise<void> => {
  if (!redisClient) {
    return;
  }

  const client = redisClient;
  redisClient = null;
  try {
    await client.quit();
  } catch (error) {
    logger.warn(`Redis did not close cleanly, dropping the connection: ${(error as Error).message}`);
    client.disconnect();
  }
};
