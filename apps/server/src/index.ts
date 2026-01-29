import chalk from "chalk";
import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import morgan from "morgan";
import { CLOSE_DB, CONNECT_DB } from "src/config/database";
import environmentConfig from "src/config/environment";
import logger from "@workspace/shared/utils/logger";
import exitHook from "async-exit-hook";
import { APIs_V1 } from "src/routes/v1";
import { errorHandlingMiddleware } from "src/middlewares/error-handling.middleware";
import cors from "cors";
import { corsOptions } from "src/config/cors";
import cookieParser from "cookie-parser";
import http from "node:http";
import { Server } from "socket.io";
import { inviteUserToBoardSocket } from "src/sockets/invitation.socket";

const START_SERVER = () => {
  // Create Express app
  const app = express();
  const port = environmentConfig.PORT;

  // Disable caching
  app.use((_request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
    response.set("Cache-Control", "no-store");
    next();
  });

  // Setup cookie parser
  app.use(cookieParser());

  // Setup CORS
  app.use(cors(corsOptions));

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

  // Create HTTP server and setup Socket.io
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: corsOptions,
  });
  io.on("connection", (socket) => {
    logger.info(chalk.greenBright(`New client connected: ${socket.id}`));
    inviteUserToBoardSocket(socket);
  });
  io.on("disconnect", (socket) => {
    logger.info(chalk.yellowBright(`Client disconnected: ${socket.id}`));
  });

  // Start the server
  server.listen(port, () => {
    logger.info(chalk.bgBlueBright(`Server is running at http://localhost:${port}`));
  });

  // Handle graceful shutdown
  exitHook(() => {
    logger.info("4. Closing MongoDB Cloud Atlas connection...");
    void CLOSE_DB();
    logger.info(chalk.bgBlueBright("Shutting down server..."));
  });
};

void (async () => {
  try {
    logger.info("1. Connecting to MongoDB Cloud Atlas...");
    await CONNECT_DB();
    logger.info("2. Connected to MongoDB Cloud Atlas!");
    logger.info("3. Starting Express server...");
    START_SERVER();
  } catch (error) {
    throw new Error(`Failed to start server: ${(error as Error).message}`);
  }
})();
