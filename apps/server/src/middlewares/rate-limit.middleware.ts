import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";

import environmentConfig from "src/config/environment";
import type { AsyncRequestHandler } from "src/types/middleware.type";
import { checkRateLimit } from "src/utils/rate-limiter";
import { actorId } from "src/utils/request-user";

const WINDOW_SECONDS = 60;

const perUser =
  (bucket: string, limit: number): AsyncRequestHandler =>
  async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
    try {
      await checkRateLimit(`rl:${bucket}:${actorId(request)}`, limit, WINDOW_SECONDS, bucket);
      next();
    } catch (error) {
      next(error);
    }
  };

export const rateLimitMiddleware = {
  write: perUser("write", environmentConfig.WRITE_RATE_LIMIT_PER_MINUTE),
  invite: perUser("invite", environmentConfig.INVITE_RATE_LIMIT_PER_MINUTE),
};
