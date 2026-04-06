import os from "node:os";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

const getLoadBalancerProbe = async (
  _request: ExpressRequest,
  response: ExpressResponse,
  next: NextFunction
): Promise<void> => {
  try {
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Load balancer probe fetched successfully",
      data: {
        hostname: process.env.HOSTNAME ?? os.hostname(),
        pid: process.pid,
        uptimeInSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const systemController = {
  getLoadBalancerProbe,
};
