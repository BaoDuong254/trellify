import type { ConnectionOptions } from "bullmq";

import environmentConfig from "src/config/environment";

export const createRedisConnection = (): ConnectionOptions => ({
  url: environmentConfig.REDIS_URL,
});
