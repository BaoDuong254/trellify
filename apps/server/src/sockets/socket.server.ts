import { createAdapter } from "@socket.io/redis-adapter";
import type Redis from "ioredis";

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

export const setupSocketAdapter = async (io: AppServer): Promise<void> => {
  // Duplicate Redis clients for pub/sub because the Redis adapter requires
  // separate clients for publishing and subscribing.
  const pubClient = getRedisClient().duplicate();
  const subClient = getRedisClient().duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  adapterClients = [pubClient, subClient];
  await Promise.all([pubClient.ping(), subClient.ping()]);
};

export const closeSocketAdapter = async (): Promise<void> => {
  await Promise.all(adapterClients.map((client) => client.quit()));
  adapterClients = [];
  ioInstance = null;
};
