import { inject } from "vitest";

process.env.MONGODB_URI = inject("mongoUri");
process.env.REDIS_URL = inject("redisUrl");
