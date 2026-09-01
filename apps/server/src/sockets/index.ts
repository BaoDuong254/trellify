import type { Server as HttpServer } from "node:http";

import chalk from "chalk";
import { Server } from "socket.io";

import logger from "@workspace/shared/utils/logger";
import { socketRoom } from "@workspace/shared/utils/socket-events";

import { corsOptions } from "src/config/cors";
import { connectedSockets } from "src/providers/metrics.provider";
import { registerBoardSocketHandlers } from "src/sockets/board/board.handlers";
import { registerViewerRegistryRecovery } from "src/sockets/board/board.viewers";
import { registerSocketAuth } from "src/sockets/socket.auth";
import { setIo, setupSocketAdapter } from "src/sockets/socket.server";
import type { AppServer } from "src/types/socket.type";

const registerConnectionHandlers = (io: AppServer): void => {
  io.on("connection", (socket) => {
    logger.info(chalk.greenBright(`New client connected: ${socket.id} (${socket.data.user._id})`));
    connectedSockets.inc();
    void socket.join(socketRoom.user(socket.data.user._id));
    registerBoardSocketHandlers(io, socket);

    socket.on("disconnect", (reason) => {
      connectedSockets.dec();
      logger.info(chalk.yellowBright(`Client disconnected: ${socket.id} (${reason})`));
    });
  });
};

export const startSockets = async (httpServer: HttpServer): Promise<AppServer> => {
  const io: AppServer = new Server(httpServer, { cors: corsOptions });

  setIo(io);
  await setupSocketAdapter(io);
  registerViewerRegistryRecovery(io);
  registerSocketAuth(io);
  registerConnectionHandlers(io);

  return io;
};
