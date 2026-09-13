import { Request as ExpressRequest } from "express";
import { StatusCodes } from "http-status-codes";

import ApiError from "src/utils/api-error";

export const actorId = (request: ExpressRequest): string => {
  const decoded = request.jwtDecoded;
  if (typeof decoded !== "object" || decoded === null || typeof decoded._id !== "string") {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized!");
  }
  return decoded._id;
};

export const clientIp = (request: ExpressRequest): string | undefined => {
  const realIp = request.headers["x-real-ip"];
  return typeof realIp === "string" && realIp !== "" ? realIp : request.ip;
};
