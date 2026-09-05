import { randomUUID } from "node:crypto";

import logger from "@workspace/shared/utils/logger";

import environmentConfig from "src/config/environment";
import { RELEASE_LOCK_SCRIPT, withTimeout } from "src/providers/cache.provider";
import { bloomFilterChecks, bloomFilterItems } from "src/providers/metrics.provider";
import { getRedisClient } from "src/providers/redis.provider";

const BUILD_LOCK_TTL_MS = 300_000;
const INSERT_BATCH_SIZE = 1000;
const FILTER_EXPANSION = 2;

export type BloomFilter = {
  name: string;
  key: string;
  capacity: number;
  errorRate: number;
};

const MIGHT_EXIST_SCRIPT = `
if redis.call("exists", KEYS[1]) == 0 then return 1 end
return redis.call("bf.exists", KEYS[1], ARGV[1])
`;

const ADD_IF_BUILT_SCRIPT = `
if redis.call("exists", KEYS[1]) == 0 then return 0 end
return redis.call("bf.add", KEYS[1], ARGV[1])
`;

const buildKeyOf = (filter: BloomFilter): string => `${filter.key}:building`;
const lockKeyOf = (filter: BloomFilter): string => `sf:${filter.key}`;

export const isPossiblyPresent = async (filter: BloomFilter, item: string): Promise<boolean> => {
  if (!environmentConfig.BLOOM_FILTER_ENABLED) {
    bloomFilterChecks.inc({ filter: filter.name, result: "skipped" });
    return true;
  }

  try {
    const verdict = await withTimeout(getRedisClient().eval(MIGHT_EXIST_SCRIPT, 1, filter.key, item));
    const isPresent = verdict === 1;
    bloomFilterChecks.inc({ filter: filter.name, result: isPresent ? "present" : "absent" });
    return isPresent;
  } catch (error) {
    logger.warn(`Bloom filter ${filter.name} unavailable for ${item}, reading through: ${(error as Error).message}`);
    bloomFilterChecks.inc({ filter: filter.name, result: "error" });
    return true;
  }
};

export const addItem = async (filter: BloomFilter, item: string): Promise<void> => {
  if (!environmentConfig.BLOOM_FILTER_ENABLED) return;

  try {
    await withTimeout(getRedisClient().eval(ADD_IF_BUILT_SCRIPT, 1, filter.key, item));
  } catch (error) {
    logger.error(
      `Could not add ${item} to bloom filter ${filter.name}, dropping the filter so probes fail open: ${(error as Error).message}`
    );
    try {
      await withTimeout(getRedisClient().del(filter.key));
      bloomFilterItems.set({ filter: filter.name }, 0);
    } catch (dropError) {
      logger.error(`Could not drop bloom filter ${filter.name}: ${(dropError as Error).message}`);
    }
  }
};

export const buildFilter = async (
  filter: BloomFilter,
  loadItems: () => AsyncIterable<string>,
  countItems: () => Promise<number>
): Promise<void> => {
  if (!environmentConfig.BLOOM_FILTER_ENABLED) return;

  const client = getRedisClient();
  const buildKey = buildKeyOf(filter);
  const lockKey = lockKeyOf(filter);
  const token = randomUUID();

  try {
    if ((await withTimeout(client.exists(filter.key))) === 1) {
      const held = Number(await client.call("BF.CARD", filter.key));
      bloomFilterItems.set({ filter: filter.name }, held);

      const expected = await countItems();
      if (held >= expected) return;

      logger.warn(
        `Bloom filter ${filter.name} holds ${held} ids but the source has ${expected}, rebuilding so ids added out of band cannot read as absent`
      );
    }
    if ((await withTimeout(client.set(lockKey, token, "PX", BUILD_LOCK_TTL_MS, "NX"))) !== "OK") return;
  } catch (error) {
    logger.warn(`Could not start the ${filter.name} bloom filter build: ${(error as Error).message}`);
    return;
  }

  try {
    await client.del(buildKey);
    await client.call("BF.RESERVE", buildKey, filter.errorRate, filter.capacity, "EXPANSION", FILTER_EXPANSION);

    let batch: string[] = [];
    let inserted = 0;
    const flush = async (): Promise<void> => {
      if (batch.length === 0) return;
      await client.call("BF.MADD", buildKey, ...batch);
      inserted += batch.length;
      batch = [];
    };

    for await (const item of loadItems()) {
      batch.push(item);
      if (batch.length >= INSERT_BATCH_SIZE) await flush();
    }
    await flush();

    await client.rename(buildKey, filter.key);
    bloomFilterItems.set({ filter: filter.name }, inserted);
    logger.info(`Bloom filter ${filter.name} built with ${inserted} ids`);
  } catch (error) {
    logger.error(
      `Could not build the ${filter.name} bloom filter, probes will read through: ${(error as Error).message}`
    );
    try {
      await client.del(buildKey);
    } catch (cleanupError) {
      logger.warn(`Could not drop the ${filter.name} build key: ${(cleanupError as Error).message}`);
    }
  } finally {
    try {
      await withTimeout(client.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token));
    } catch (error) {
      logger.warn(`Could not release the ${filter.name} bloom filter lock: ${(error as Error).message}`);
    }
  }
};

export const registerBloomRecovery = (rebuild: () => Promise<void>): void => {
  getRedisClient().on("ready", () => {
    void rebuild();
  });
};
