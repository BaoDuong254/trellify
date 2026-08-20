import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize, json, errors } = format;

/**
 * Custom log format for Winston logger
 * @param info - Log information object
 * @returns Formatted log string
 */
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}] : ${message}`;
});

/**
 * Logger configuration using Winston
 *
 * @returns Configured Winston logger
 *
 * @example
 * ```ts
 * import logger from "@workspace/shared/utils/logger";
 * logger.error("This is an error message");
 * logger.warn("This is a warning message");
 * logger.info("This is an info message");
 * logger.debug("This is a debug message");
 * ```
 */
const isProduction = process.env.NODE_ENV === "production";

const logger = createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: isProduction
    ? combine(timestamp(), errors({ stack: true }), json())
    : combine(timestamp({ format: "DD-MM-YYYY HH:mm:ss" }), colorize(), logFormat),
  transports: [new transports.Console()],
});

export default logger;
