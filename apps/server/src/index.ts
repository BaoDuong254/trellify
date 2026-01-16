import chalk from "chalk";
import express from "express";
import morgan from "morgan";
import { CLOSE_DB, CONNECT_DB } from "src/config/database";
import environmentConfig from "src/config/environment";
import logger from "src/utils/logger";
import exitHook from "async-exit-hook";

const app = express();
const port = environmentConfig.PORT;

const START_SERVER = () => {
  app.get("/", (_request, response) => {
    response.send("Hello World!");
  });

  // Setup morgan with winston for logging
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );

  app.listen(port, () => {
    logger.info(chalk.bgBlueBright(`Server is running at http://localhost:${port}`));
  });

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
