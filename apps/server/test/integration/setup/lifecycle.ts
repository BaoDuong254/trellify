import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

import { CLOSE_DB, CONNECT_DB, GET_DB } from "src/config/database";
import { ENSURE_INDEXES } from "src/config/indexes";
import { closeRedisClient, getRedisClient } from "src/providers/redis.provider";
import { userQueue } from "src/queues/user/user.queue";

vi.mock("src/providers/brevo.provider", () => ({
  BrevoProvider: { sendEmail: vi.fn(async () => {}) },
}));

vi.mock("src/providers/cloudinary.provider", () => ({
  CloudinaryProvider: {
    streamUpload: vi.fn(async () => ({ secure_url: "https://res.cloudinary.test/image.png" })),
  },
}));

vi.mock("src/middlewares/turnstile.middleware", () => ({
  turnstileMiddleware: {
    verify: (_request: ExpressRequest, _response: ExpressResponse, next: NextFunction): void => next(),
  },
}));

beforeAll(async () => {
  await CONNECT_DB();
  await ENSURE_INDEXES();
});

beforeEach(async () => {
  const collections = await GET_DB().collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
  await getRedisClient().flushall();
});

afterAll(async () => {
  await userQueue.close();
  await closeRedisClient();
  await CLOSE_DB();
});
