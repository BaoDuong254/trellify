import { StatusCodes } from "http-status-codes";
import { describe, expect, it, vi } from "vitest";

import { getRedisClient } from "src/providers/redis.provider";
import { checkRateLimit } from "src/utils/rate-limiter";

const KEY = "rl:test:user-1";

describe("checkRateLimit", () => {
  it("allows up to the limit and throws 429 on the next call", async () => {
    for (let call = 0; call < 3; call++) {
      await expect(checkRateLimit(KEY, 3, 60)).resolves.toBeUndefined();
    }

    await expect(checkRateLimit(KEY, 3, 60)).rejects.toMatchObject({ statusCode: StatusCodes.TOO_MANY_REQUESTS });
  });

  it("gives the counter a TTL on the first hit so a caller can never be locked out for good", async () => {
    await checkRateLimit(KEY, 10, 60);

    const ttl = await getRedisClient().ttl(KEY);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it("fails open when Redis is unavailable", async () => {
    const failure = vi.spyOn(getRedisClient(), "eval").mockRejectedValueOnce(new Error("connection lost"));

    await expect(checkRateLimit(KEY, 0, 60)).resolves.toBeUndefined();

    failure.mockRestore();
  });
});
