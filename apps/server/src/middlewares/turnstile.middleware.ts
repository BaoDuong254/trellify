import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import environmentConfig from "src/config/environment";
import ApiError from "src/utils/api-error";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const verify = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  const { turnstileToken } = request.body as { turnstileToken?: string };

  if (!turnstileToken) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, "Turnstile token is required"));
    return;
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: environmentConfig.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? request.ip,
      }),
      signal: AbortSignal.timeout(5000),
    });

    const data = (await response.json()) as { success: boolean };

    if (!data.success) {
      next(new ApiError(StatusCodes.FORBIDDEN, "Turnstile verification failed"));
      return;
    }

    next();
  } catch {
    next(new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "Turnstile service unavailable"));
  }
};

export const turnstileMiddleware = { verify };
