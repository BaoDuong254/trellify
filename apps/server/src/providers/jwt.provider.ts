import logger from "@workspace/shared/utils/logger";
import { StatusCodes } from "http-status-codes";
import JWT from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { StringValue } from "ms";
import ApiError from "src/utils/api-error";

const generateToken = async (
  userInfo: {
    _id: ObjectId;
    email: string;
  },
  secretSignature: string,
  tokenLife: StringValue
) => {
  try {
    return JWT.sign(userInfo, secretSignature, { algorithm: "HS256", expiresIn: tokenLife });
  } catch (error) {
    logger.error("JWT Token Generation Error:", error);
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Could not generate token");
  }
};

const verifyToken = async (token: string, secretSignature: string) => {
  try {
    return JWT.verify(token, secretSignature);
  } catch (error) {
    logger.error("JWT Token Verification Error:", error);
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Token is invalid or has expired");
  }
};

export const JwtProvider = {
  generateToken,
  verifyToken,
};
