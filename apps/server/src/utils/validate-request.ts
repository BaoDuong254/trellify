import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import type { ZodType } from "zod";

import type { AsyncRequestHandler } from "src/types/middleware.type";
import ApiError from "src/utils/api-error";

type RequestSchemas = {
  params?: ZodType;
  body?: ZodType;
};

export const validateRequest =
  (schemas: RequestSchemas): AsyncRequestHandler =>
  async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
    try {
      if (schemas.params) await schemas.params.parseAsync(request.params);
      if (schemas.body) request.body = await schemas.body.parseAsync(request.body);
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage));
    }
  };
