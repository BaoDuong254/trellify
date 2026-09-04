import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import type { Redis } from "ioredis";

import logger from "@workspace/shared/utils/logger";

import environmentConfig from "src/config/environment";
import { cacheLoaderDuration, cacheRequests } from "src/providers/metrics.provider";
import { getRedisClient } from "src/providers/redis.provider";

const LOCK_TTL_MS = 10_000;
const LEADER_POLL_INTERVAL_MS = 20;
const LEADER_WAIT_TIMEOUT_MS = 3000;
const TTL_JITTER_RATIO = 0.1;

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

type CacheOptions<T> = {
  cacheName: string;
  key: string;
  ttlSeconds: number;
  negativeTtlSeconds: number;
  load: () => Promise<T | null>;
};

type Decision<T> =
  | { kind: "value"; value: T | null }
  | { kind: "load"; store: (value: T | null) => Promise<void>; release: () => Promise<void> };

const noop = async (): Promise<void> => {};

const lockKey = (key: string): string => `sf:${key}`;

const jitteredTtl = (ttlSeconds: number): number => {
  const spread = 1 - TTL_JITTER_RATIO + Math.random() * TTL_JITTER_RATIO * 2;
  return Math.max(1, Math.round(ttlSeconds * spread));
};

const withTimeout = async <T>(operation: Promise<T>): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("Redis command timed out")), environmentConfig.CACHE_COMMAND_TIMEOUT_MS);
  });
  try {
    return await Promise.race([operation, expiry]);
  } finally {
    clearTimeout(timer);
  }
};

const waitForLeader = async (client: Redis, key: string): Promise<string | null> => {
  const deadline = Date.now() + LEADER_WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await delay(LEADER_POLL_INTERVAL_MS);
    const cached = await withTimeout(client.get(key));
    if (cached !== null) return cached;
  }
  return null;
};

const parseEntry = <T>(raw: string): T | null => JSON.parse(raw) as T | null;

const decide = async <T>(options: CacheOptions<T>): Promise<Decision<T>> => {
  const { cacheName, key } = options;

  try {
    const client = getRedisClient();

    const cached = await withTimeout(client.get(key));
    if (cached !== null) {
      const value = parseEntry<T>(cached);
      cacheRequests.inc({ cache: cacheName, result: value === null ? "negative_hit" : "hit" });
      return { kind: "value", value };
    }

    const token = randomUUID();
    const acquired = await withTimeout(client.set(lockKey(key), token, "PX", LOCK_TTL_MS, "NX"));

    if (acquired !== "OK") {
      const leaderValue = await waitForLeader(client, key);
      if (leaderValue !== null) {
        cacheRequests.inc({ cache: cacheName, result: "coalesced_remote" });
        return { kind: "value", value: parseEntry<T>(leaderValue) };
      }
      cacheRequests.inc({ cache: cacheName, result: "wait_timeout" });
      return { kind: "load", store: noop, release: noop };
    }

    cacheRequests.inc({ cache: cacheName, result: "miss" });

    const store = async (value: T | null): Promise<void> => {
      const ttlSeconds = value === null ? options.negativeTtlSeconds : options.ttlSeconds;
      try {
        await withTimeout(client.set(key, JSON.stringify(value), "EX", jitteredTtl(ttlSeconds)));
      } catch (error) {
        logger.warn(`Could not store ${cacheName} cache entry ${key}: ${(error as Error).message}`);
      }
    };

    const release = async (): Promise<void> => {
      try {
        await withTimeout(client.eval(RELEASE_LOCK_SCRIPT, 1, lockKey(key), token));
      } catch (error) {
        logger.warn(`Could not release ${cacheName} cache lock ${key}: ${(error as Error).message}`);
      }
    };

    return { kind: "load", store, release };
  } catch (error) {
    logger.warn(`Cache ${cacheName} unavailable for ${key}, reading through: ${(error as Error).message}`);
    cacheRequests.inc({ cache: cacheName, result: "error" });
    return { kind: "load", store: noop, release: noop };
  }
};

const resolve = async <T>(options: CacheOptions<T>): Promise<T | null> => {
  const decision = await decide(options);
  if (decision.kind === "value") return decision.value;

  const stopTimer = cacheLoaderDuration.startTimer({ cache: options.cacheName });
  try {
    const value = await options.load();
    await decision.store(value);
    return value;
  } finally {
    stopTimer();
    await decision.release();
  }
};

const inFlight = new Map<string, Promise<unknown>>();

export const getOrLoad = async <T>(options: CacheOptions<T>): Promise<T | null> => {
  if (!environmentConfig.CACHE_ENABLED) {
    cacheRequests.inc({ cache: options.cacheName, result: "disabled" });
    return options.load();
  }

  const pending = inFlight.get(options.key);
  if (pending) {
    cacheRequests.inc({ cache: options.cacheName, result: "coalesced_local" });
    return (await pending) as T | null;
  }

  const next = resolve(options);
  inFlight.set(options.key, next);
  try {
    return await next;
  } finally {
    if (inFlight.get(options.key) === next) inFlight.delete(options.key);
  }
};

export const invalidate = async (key: string): Promise<void> => {
  if (!environmentConfig.CACHE_ENABLED) return;
  try {
    await withTimeout(getRedisClient().del(key));
  } catch (error) {
    logger.warn(`Could not invalidate cache key ${key}: ${(error as Error).message}`);
  }
};
