import { describe, expect, it } from "vitest";

import { type BloomFilter, addItem, buildFilter, isPossiblyPresent, probeAndRead } from "src/providers/bloom.provider";
import { getRedisClient } from "src/providers/redis.provider";

const FILTER: BloomFilter = { name: "test", key: "bf:test:items", capacity: 1000, errorRate: 0.001 };

const itemsOf = (items: string[]) =>
  async function* (): AsyncGenerator<string> {
    yield* items;
  };

const build = async (items: string[], expectedCount = items.length): Promise<void> => {
  await buildFilter(FILTER, itemsOf(items), async () => expectedCount);
};

describe("bloom provider", () => {
  it("reports built ids as present and unknown ids as absent", async () => {
    await build(["a", "b", "c"]);

    await expect(isPossiblyPresent(FILTER, "a")).resolves.toBe(true);
    await expect(isPossiblyPresent(FILTER, "never-added")).resolves.toBe(false);
  });

  it("fails open while no filter has been built", async () => {
    await expect(isPossiblyPresent(FILTER, "anything")).resolves.toBe(true);
  });

  it("fails open when the key holds another type instead of reading BF.EXISTS's 0 as absent", async () => {
    await getRedisClient().set(FILTER.key, "not a bloom filter");

    await expect(isPossiblyPresent(FILTER, "anything")).resolves.toBe(true);
    await expect(probeAndRead(FILTER, "anything", "c:test:anything")).resolves.toMatchObject({ mightExist: true });
  });

  it("never lets addItem create a filter that would hold only one id", async () => {
    await addItem(FILTER, "lonely");

    await expect(getRedisClient().exists(FILTER.key)).resolves.toBe(0);
    await expect(isPossiblyPresent(FILTER, "some-other-real-id")).resolves.toBe(true);
  });

  it("adds new ids to a built filter", async () => {
    await build(["a"]);
    await addItem(FILTER, "b");

    await expect(isPossiblyPresent(FILTER, "b")).resolves.toBe(true);
  });

  it("rebuilds when the filter holds fewer ids than the source, so out-of-band rows cannot 404", async () => {
    await build(["a"]);
    await build(["a", "restored-from-backup"]);

    await expect(isPossiblyPresent(FILTER, "restored-from-backup")).resolves.toBe(true);
  });

  it("overwrites a wrong-type key on build instead of failing open forever", async () => {
    await getRedisClient().set(FILTER.key, "stale");

    await build(["a"]);

    await expect(getRedisClient().type(FILTER.key)).resolves.toBe("MBbloom--");
    await expect(isPossiblyPresent(FILTER, "missing")).resolves.toBe(false);
  });

  it("returns the cached entry from the same round trip when the id is present", async () => {
    await build(["board-1"]);
    await getRedisClient().set("c:test:board-1", JSON.stringify({ ok: true }));

    await expect(probeAndRead(FILTER, "board-1", "c:test:board-1")).resolves.toEqual({
      mightExist: true,
      cached: JSON.stringify({ ok: true }),
    });
    await expect(probeAndRead(FILTER, "board-2", "c:test:board-2")).resolves.toEqual({
      mightExist: false,
      cached: undefined,
    });
  });
});
