import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express, Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import morgan from "morgan";

import logger from "@workspace/shared/utils/logger";

import { corsOptions } from "src/config/cors";
import { errorHandlingMiddleware } from "src/middlewares/error-handling.middleware";
import { metricsMiddleware } from "src/middlewares/metrics.middleware";
import { APIs_V1 } from "src/routes/v1";
import ApiError from "src/utils/api-error";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Cross-Origin-Resource-Policy": "same-site",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "X-Content-Type-Options": "nosniff",
};

export const createApp = (): Express => {
  const app = express();

  // Trust proxy headers (e.g., X-Forwarded-For) for correct client IP detection
  app.set("trust proxy", true);

  // Disable caching and set security headers
  app.use((_request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
    response.set(RESPONSE_HEADERS);
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

  app.use((_request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
    next(new ApiError(StatusCodes.NOT_FOUND, "Error.RouteNotFound"));
  });

  // Error handling middleware
  app.use(errorHandlingMiddleware);

  return app;
};
