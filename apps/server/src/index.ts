import chalk from "chalk";
import express from "express";
import morgan from "morgan";
import logger from "src/utils/logger";
const app = express();
const port = 3000;

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
