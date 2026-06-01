import environmentConfig from "src/config/environment";
import type { ConnectionOptions } from "bullmq";

export const createRedisConnection = (): ConnectionOptions => ({
  url: environmentConfig.REDIS_URL,
});
