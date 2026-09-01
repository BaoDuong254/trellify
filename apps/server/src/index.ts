import http from "node:http";

import exitHook from "async-exit-hook";
import chalk from "chalk";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import morgan from "morgan";

import logger from "@workspace/shared/utils/logger";

import { corsOptions } from "src/config/cors";
import { CLOSE_DB, CONNECT_DB } from "src/config/database";
import environmentConfig from "src/config/environment";
import { ENSURE_INDEXES } from "src/config/indexes";
import { errorHandlingMiddleware } from "src/middlewares/error-handling.middleware";
import { metricsMiddleware } from "src/middlewares/metrics.middleware";
import { startMetricsServer } from "src/providers/metrics.provider";
import { closeRedisClient } from "src/providers/redis.provider";
import { userQueue } from "src/queues/user/user.queue";
import { APIs_V1 } from "src/routes/v1";
import { startSockets } from "src/sockets";
import { closeSocketAdapter } from "src/sockets/socket.server";

const START_SERVER = async (): Promise<void> => {
  // Create Express app
  const app = express();
  const port = environmentConfig.PORT;

  // Trust proxy headers (e.g., X-Forwarded-For) for correct client IP detection
  app.set("trust proxy", true);

  // Disable caching
  app.use((_request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
    response.set("Cache-Control", "no-store");
    next();
  });

  // Healthcheck endpoint (before CORS middleware)
  app.get("/api/v1/status", (_request: ExpressRequest, response: ExpressResponse) => {
    response.status(200).json({
      message: "API v1 is running",
      status: 200,
    });
  });

  // Record latency for every request, including ones that never match a route
  app.use(metricsMiddleware);

  // Setup cookie parser
  app.use(cookieParser());

  // Setup CORS
  app.use(cors(corsOptions));

  // Disable 'X-Powered-By' header for security
  app.disable("x-powered-by");

  // Setup morgan with winston for logging
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );

  // Middleware to parse JSON requests
  app.use(express.json());

  // App routes setup
  app.use("/api/v1", APIs_V1);

  // Error handling middleware
  app.use(errorHandlingMiddleware);

  // Start metrics server for Prometheus scraping
  const metricsServer = startMetricsServer(environmentConfig.METRICS_PORT, "Server");

  // Create HTTP server and setup Socket.io
  const server = http.createServer(app);
  const io = await startSockets(server);

  // Start the server
  server.listen(port, () => {
    logger.info(chalk.bgBlueBright(`Server is running at http://localhost:${port}`));
  });

  // Handle graceful shutdown
  exitHook((done) => {
    void (async () => {
      logger.info("4. Closing metrics server...");
      await new Promise<void>((resolve) => metricsServer.close(() => resolve()));
      logger.info("5. Draining HTTP and Socket.io connections...");
      await Promise.race([
        new Promise<void>((resolve) => io.close(() => resolve())),
        new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
      ]);
      logger.info("6. Closing BullMQ queue...");
      await userQueue.close();
      logger.info("7. Closing Socket.io Redis adapter...");
      await closeSocketAdapter();
      logger.info("8. Closing Redis client...");
      await closeRedisClient();
      logger.info("9. Closing MongoDB connection...");
      await CLOSE_DB();
      logger.info(chalk.bgBlueBright("Shutting down server..."));
      done();
    })();
  });
};

void (async () => {
  try {
    logger.info("1. Connecting to MongoDB Cloud Atlas...");
    await CONNECT_DB();
    logger.info("2. Connected to MongoDB Cloud Atlas!");
    await ENSURE_INDEXES();
    logger.info("3. Starting Express server...");
    await START_SERVER();
  } catch (error) {
    throw new Error(`Failed to start server: ${(error as Error).message}`, { cause: error });
  }
})();
