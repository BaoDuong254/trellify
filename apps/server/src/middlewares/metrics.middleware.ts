import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";

import { httpRequestDuration } from "src/providers/metrics.provider";

const routeLabel = (request: ExpressRequest): string => {
  const routePath = request.route?.path as string | undefined;
  if (!routePath) return "unmatched";
  return `${request.baseUrl}${routePath === "/" ? "" : routePath}` || "/";
};

export const metricsMiddleware = (request: ExpressRequest, response: ExpressResponse, next: NextFunction): void => {
  const stopTimer = httpRequestDuration.startTimer();
  response.on("finish", () => {
    stopTimer({
      method: request.method,
      route: routeLabel(request),
      status_code: response.statusCode,
    });
  });
  next();
};
