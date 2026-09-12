import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, it, vi } from "vitest";

import { getOrLoad, invalidate } from "src/providers/cache.provider";
import { getRedisClient } from "src/providers/redis.provider";

const KEY = "c:test:entry";

const options = <T>(load: () => Promise<T | null>) => ({
  cacheName: "test",
  key: KEY,
  ttlSeconds: 30,
  negativeTtlSeconds: 5,
  load,
});

describe("cache provider", () => {
  it("runs the loader once for a burst of concurrent misses on a cold key", async () => {
    const load = vi.fn(async () => {
      await delay(50);
      return { value: 42 };
    });

    const results = await Promise.all(Array.from({ length: 20 }, () => getOrLoad(options(load))));

    expect(load).toHaveBeenCalledTimes(1);
    expect(results).toEqual(Array.from({ length: 20 }, () => ({ value: 42 })));
  });

  it("serves the stored value without calling the loader again", async () => {
    const load = vi.fn(async () => ({ value: 1 }));

    await getOrLoad(options(load));
    await getOrLoad(options(load));

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("caches a miss as null under the negative TTL", async () => {
    const load = vi.fn(async () => null);

    await expect(getOrLoad(options(load))).resolves.toBeNull();
    await expect(getOrLoad(options(load))).resolves.toBeNull();

    expect(load).toHaveBeenCalledTimes(1);
    const ttl = await getRedisClient().ttl(KEY);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(6);
  });

  it("loads again after invalidate", async () => {
    const load = vi.fn(async () => ({ value: "fresh" }));

    await getOrLoad(options(load));
    await invalidate(KEY);
    await getOrLoad(options(load));

    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reads through to the loader when Redis fails", async () => {
    const client = getRedisClient();
    const failure = vi.spyOn(client, "get").mockRejectedValueOnce(new Error("connection lost"));
    const load = vi.fn(async () => ({ value: "from mongo" }));

    await expect(getOrLoad(options(load))).resolves.toEqual({ value: "from mongo" });

    expect(load).toHaveBeenCalledTimes(1);
    failure.mockRestore();
  });

  it("trusts cachedRaw instead of issuing its own GET", async () => {
    const client = getRedisClient();
    const get = vi.spyOn(client, "get");
    const load = vi.fn(async () => ({ value: "unused" }));

    const value = await getOrLoad({ ...options(load), cachedRaw: JSON.stringify({ value: "prefetched" }) });

    expect(value).toEqual({ value: "prefetched" });
    expect(get).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    get.mockRestore();
  });
});
