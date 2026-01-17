import { StatusCodes } from "http-status-codes";
import { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from "express";
import environmentConfig from "src/config/environment";

interface ApiError extends Error {
  statusCode: number;
}

export const errorHandlingMiddleware = (
  error: ApiError,
  _request: ExpressRequest,
  response: ExpressResponse,
  _next: NextFunction
) => {
  const statusCode = error.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;

  const responseError: {
    statusCode: number;
    message: string;
    stack?: string;
  } = {
    statusCode,
    message: error.message || StatusCodes[statusCode] || "Internal Server Error",
    stack: error.stack,
  };

  if (environmentConfig.NODE_ENV !== "development") delete responseError.stack;

  response.status(responseError.statusCode).json(responseError);
};
