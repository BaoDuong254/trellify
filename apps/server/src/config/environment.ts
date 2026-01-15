import fs from "node:fs";
import path from "node:path";
import z from "zod";
import chalk from "chalk";
import logger from "src/utils/logger";
import { config } from "dotenv";

const environmentPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(environmentPath)) {
  config({ path: environmentPath });
} else if (process.env.NODE_ENV !== "production") {
  logger.error(chalk.red("Can not find .env file at path:"), chalk.yellow(environmentPath));
  throw new Error(".env file not found");
}

const configSchema = z.object({
  PORT: z
    .string()
    .default("3000")
    .transform((value) => Number.parseInt(value, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  DATABASE_NAME: z.string().min(1, "DATABASE_NAME is required"),
});

const configServer = configSchema.safeParse(process.env);

if (!configServer.success) {
  logger.error(chalk.red("Invalid environment variables:"), z.treeifyError(configServer.error));
  throw new Error("Invalid environment variables");
}

const environmentConfig = configServer.data;

export default environmentConfig;
