import { createAdapter } from "@socket.io/redis-adapter";
import type Redis from "ioredis";

import logger from "@workspace/shared/utils/logger";

import { getRedisClient } from "src/providers/redis.provider";
import type { AppServer } from "src/types/socket.type";

let ioInstance: AppServer | null = null;
let adapterClients: Redis[] = [];

export const setIo = (io: AppServer): void => {
  ioInstance = io;
};

export const getIo = (): AppServer | null => {
  return ioInstance;
};

const ADAPTER_CLIENT_OPTIONS = { commandTimeout: undefined, maxRetriesPerRequest: null };

export const setupSocketAdapter = async (io: AppServer): Promise<void> => {
  // Duplicate Redis clients for pub/sub because the Redis adapter requires
  // separate clients for publishing and subscribing.
  const pubClient = getRedisClient().duplicate(ADAPTER_CLIENT_OPTIONS);
  const subClient = getRedisClient().duplicate(ADAPTER_CLIENT_OPTIONS);
  io.adapter(createAdapter(pubClient, subClient));
  adapterClients = [pubClient, subClient];
  await Promise.all([pubClient.ping(), subClient.ping()]);
};

const quitQuietly = async (client: Redis): Promise<void> => {
  try {
    await client.quit();
  } catch (error) {
    logger.warn(`Socket.io Redis client did not close cleanly: ${(error as Error).message}`);
    client.disconnect();
  }
};

export const closeSocketAdapter = async (): Promise<void> => {
  await Promise.all(adapterClients.map((client) => quitQuietly(client)));
  adapterClients = [];
  ioInstance = null;
};
