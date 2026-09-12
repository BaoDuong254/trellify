import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers";
import type { TestProject } from "vitest/node";

const MONGO_IMAGE = "mongo:8.0";
const REDIS_IMAGE = "redis:8-alpine";
const REDIS_PORT = 6379;

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
    redisUrl: string;
  }
}

let mongo: StartedMongoDBContainer | undefined;
let redis: StartedTestContainer | undefined;

const assertBloomModuleLoaded = async (container: StartedTestContainer): Promise<void> => {
  const { output } = await container.exec(["redis-cli", "MODULE", "LIST"]);
  if (!output.includes("bf")) {
    throw new Error(`${REDIS_IMAGE} started without RedisBloom; BF.* commands and the bloom provider cannot be tested`);
  }
};

export const setup = async (project: TestProject): Promise<void> => {
  [mongo, redis] = await Promise.all([
    new MongoDBContainer(MONGO_IMAGE).start(),
    new GenericContainer(REDIS_IMAGE)
      .withExposedPorts(REDIS_PORT)
      .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
      .start(),
  ]);

  await assertBloomModuleLoaded(redis);

  project.provide("mongoUri", `${mongo.getConnectionString()}/?directConnection=true`);
  project.provide("redisUrl", `redis://${redis.getHost()}:${redis.getMappedPort(REDIS_PORT)}`);
};

export const teardown = async (): Promise<void> => {
  await Promise.all([mongo?.stop(), redis?.stop()]);
};
