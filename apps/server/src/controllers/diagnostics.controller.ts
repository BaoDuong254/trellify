import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";

import { diagnosticsService } from "src/services/diagnostics.service";

const forwardEnvelope = async (
  request: ExpressRequest,
  response: ExpressResponse,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, headers } = await diagnosticsService.forwardEnvelope(request.body);
    response.status(status).set(headers).end();
  } catch (error) {
    next(error);
  }
};

export const diagnosticsController = {
  forwardEnvelope,
};
