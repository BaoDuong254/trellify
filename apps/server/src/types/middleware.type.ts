import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";

export type AsyncRequestHandler = (
  request: ExpressRequest,
  response: ExpressResponse,
  next: NextFunction
) => Promise<void>;
