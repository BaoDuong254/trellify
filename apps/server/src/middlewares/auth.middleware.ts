import { StatusCodes } from "http-status-codes";
import environmentConfig from "src/config/environment";
import { JwtProvider } from "src/providers/jwt.provider";
import ApiError from "src/utils/api-error";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";

const isAuthorized = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  const clientAccessToken = request.cookies?.accessToken as string;
  if (!clientAccessToken) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized! No access token provided."));
    return;
  }
  try {
    const accessTokenDecoded = await JwtProvider.verifyToken(
      clientAccessToken,
      environmentConfig.ACCESS_TOKEN_SECRET_SIGNATURE
    );
    request.jwtDecoded = accessTokenDecoded;
    next();
  } catch (error) {
    if (error instanceof Error && error.name === "TokenExpiredError") {
      next(new ApiError(StatusCodes.GONE, "Need to refresh token."));
      return;
    }
    next(new ApiError(StatusCodes.UNAUTHORIZED, "Unauthorized!"));
  }
};

export const authMiddleware = { isAuthorized };
