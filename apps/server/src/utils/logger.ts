import { createLogger, transports, format } from "winston";
const { combine, timestamp, printf, colorize } = format;

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
 * import logger from "@/utils/logger.js";
 * logger.error("This is an error message");
 * logger.warn("This is a warning message");
 * logger.info("This is an info message");
 * logger.debug("This is a debug message");
 * ```
 */
const logger = createLogger({
  level: "info",
  format: combine(timestamp({ format: "DD-MM-YYYY HH:mm:ss" }), colorize(), logFormat),
  transports: [new transports.Console()],
});

export default logger;
