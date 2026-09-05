import fs from "node:fs";
import path from "node:path";

import chalk from "chalk";
import { config } from "dotenv";
import z from "zod";

import logger from "@workspace/shared/utils/logger";

const environmentPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(environmentPath)) {
  config({ path: environmentPath });
} else if (process.env.NODE_ENV !== "production") {
  logger.error(chalk.red("Can not find .env file at path:"), chalk.yellow(environmentPath));
  throw new Error(".env file not found");
}

const configSchema = z.object({
  PORT: z.coerce
    .number("PORT must be a number")
    .int("PORT must be an integer")
    .positive("PORT must be a positive integer")
    .default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().min(1, "CLIENT_URL is required"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  DATABASE_NAME: z.string().min(1, "DATABASE_NAME is required"),
  BREVO_API_KEY: z.string().min(1, "BREVO_API_KEY is required"),
  ADMIN_EMAIL_ADDRESS: z.email().min(1, "ADMIN_EMAIL_ADDRESS is required"),
  ADMIN_EMAIL_NAME: z.string().min(1, "ADMIN_EMAIL_NAME is required"),
  ACCESS_TOKEN_SECRET_SIGNATURE: z.string().min(1, "ACCESS_TOKEN_SECRET_SIGNATURE is required"),
  ACCESS_TOKEN_LIFE: z.string().min(1, "ACCESS_TOKEN_LIFE is required"),
  REFRESH_TOKEN_SECRET_SIGNATURE: z.string().min(1, "REFRESH_TOKEN_SECRET_SIGNATURE is required"),
  REFRESH_TOKEN_LIFE: z.string().min(1, "REFRESH_TOKEN_LIFE is required"),
  COOKIE_MAX_AGE: z.string().min(1, "COOKIE_MAX_AGE is required"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  QUEUE_PREFIX: z.string().default("trellify"),
  WORKER_CONCURRENCY: z.coerce
    .number("WORKER_CONCURRENCY must be a number")
    .int("WORKER_CONCURRENCY must be an integer")
    .positive("WORKER_CONCURRENCY must be a positive integer")
    .default(5),
  WORKER_HEALTH_PORT: z.coerce
    .number("WORKER_HEALTH_PORT must be a number")
    .int("WORKER_HEALTH_PORT must be an integer")
    .positive("WORKER_HEALTH_PORT must be a positive integer")
    .default(3001),
  METRICS_PORT: z.coerce
    .number("METRICS_PORT must be a number")
    .int("METRICS_PORT must be an integer")
    .positive("METRICS_PORT must be a positive integer")
    .default(9464),
  TURNSTILE_SECRET_KEY: z.string().min(1, "TURNSTILE_SECRET_KEY is required"),
  CACHE_ENABLED: z.stringbool().default(true),
  BOARD_CACHE_TTL_SECONDS: z.coerce
    .number("BOARD_CACHE_TTL_SECONDS must be a number")
    .int("BOARD_CACHE_TTL_SECONDS must be an integer")
    .positive("BOARD_CACHE_TTL_SECONDS must be a positive integer")
    .default(30),
  BOARD_CACHE_NEGATIVE_TTL_SECONDS: z.coerce
    .number("BOARD_CACHE_NEGATIVE_TTL_SECONDS must be a number")
    .int("BOARD_CACHE_NEGATIVE_TTL_SECONDS must be an integer")
    .positive("BOARD_CACHE_NEGATIVE_TTL_SECONDS must be a positive integer")
    .default(15),
  BOARD_MEMBERSHIP_CACHE_TTL_SECONDS: z.coerce
    .number("BOARD_MEMBERSHIP_CACHE_TTL_SECONDS must be a number")
    .int("BOARD_MEMBERSHIP_CACHE_TTL_SECONDS must be an integer")
    .positive("BOARD_MEMBERSHIP_CACHE_TTL_SECONDS must be a positive integer")
    .default(5),
  REDIS_COMMAND_TIMEOUT_MS: z.coerce
    .number("REDIS_COMMAND_TIMEOUT_MS must be a number")
    .int("REDIS_COMMAND_TIMEOUT_MS must be an integer")
    .positive("REDIS_COMMAND_TIMEOUT_MS must be a positive integer")
    .default(2000),
  BLOOM_FILTER_ENABLED: z.stringbool().default(true),
  CACHE_COMMAND_TIMEOUT_MS: z.coerce
    .number("CACHE_COMMAND_TIMEOUT_MS must be a number")
    .int("CACHE_COMMAND_TIMEOUT_MS must be an integer")
    .positive("CACHE_COMMAND_TIMEOUT_MS must be a positive integer")
    .default(1000),
});

const configServer = configSchema.safeParse(process.env);

if (!configServer.success) {
  logger.error(`${chalk.red("Invalid environment variables:")}\n${z.prettifyError(configServer.error)}`);
  throw new Error("Invalid environment variables");
}

const environmentConfig = configServer.data;

export default environmentConfig;
