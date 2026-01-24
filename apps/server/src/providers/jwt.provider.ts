import { StatusCodes } from "http-status-codes";
import JWT from "jsonwebtoken";
import { ObjectId } from "mongodb";
import ApiError from "src/utils/api-error";

const generateToken = async (
  userInfo: {
    _id: ObjectId;
    email: string;
  },
  secretSignature: string,
  tokenLife: number
) => {
  try {
    return JWT.sign(userInfo, secretSignature, { algorithm: "HS256", expiresIn: tokenLife });
  } catch {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Could not generate token");
  }
};

const verifyToken = async (token: string, secretSignature: string) => {
  return JWT.verify(token, secretSignature);
};

export const JwtProvider = {
  generateToken,
  verifyToken,
};
