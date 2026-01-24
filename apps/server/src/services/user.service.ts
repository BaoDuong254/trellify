import { UserLoginType, UserRegistrationType, UserVerificationType } from "@workspace/shared/schemas/user.schema";
import { StatusCodes } from "http-status-codes";
import { userModel } from "src/models/user.model";
import ApiError from "src/utils/api-error";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { pickUser } from "src/utils/formatters";
import environmentConfig from "src/config/environment";
import { BrevoProvider } from "src/providers/brevo.provider";
import { JwtProvider } from "src/providers/jwt.provider";
import ms, { StringValue } from "ms";
import { ObjectId } from "mongodb";

const createNew = async (requestBody: UserRegistrationType) => {
  const existUser = await userModel.findOneByEmail(requestBody.email);
  if (existUser) {
    throw new ApiError(StatusCodes.CONFLICT, "User with this email already exists");
  }
  const nameFromEmail = requestBody.email.split("@")[0];
  const newUserData = {
    email: requestBody.email,
    password: bcryptjs.hashSync(requestBody.password, 10),
    username: nameFromEmail!,
    displayName: nameFromEmail!,
    verifyToken: uuidv4(),
  };
  const createdUser = await userModel.createNew(newUserData);
  const getNewlyCreatedUser = await userModel.findOneById(createdUser.insertedId.toString());
  const verificationLink = `${environmentConfig.CLIENT_URL}/account/verification?email=${getNewlyCreatedUser?.email}&token=${getNewlyCreatedUser?.verifyToken}`;
  const subject = "Trellify - Verify your email address";
  const htmlContent = `
    <h1>Trellify - Email Verification</h1>
    <p>Thank you for registering with Trellify! Please verify your email address by clicking the link below:</p>
    <a href="${verificationLink}">Verify Email Address</a>
    <p>If you did not create an account, please ignore this email.</p>
    <p>Best regards,<br/>The Trellify Team</p>
  `;
  await BrevoProvider.sendEmail(getNewlyCreatedUser!.email as string, subject, htmlContent);
  return pickUser(getNewlyCreatedUser);
};

const verifyAccount = async (requestBody: UserVerificationType) => {
  const existUser = await userModel.findOneByEmail(requestBody.email);
  if (!existUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  if (existUser!.isActive) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Account is already verified");
  }
  if (existUser!.verifyToken !== requestBody.token) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid verification token");
  }
  const updatedUser = await userModel.update(existUser!._id.toString(), {
    isActive: true,
    verifyToken: null,
    updatedAt: new Date(),
  });
  return pickUser(updatedUser);
};

const login = async (requestBody: UserLoginType) => {
  const existUser = await userModel.findOneByEmail(requestBody.email);
  if (!existUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  if (!existUser!.isActive) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Account is not active");
  }
  const isPasswordValid = bcryptjs.compareSync(requestBody.password, existUser!.password as string);
  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Your email or password is incorrect");
  }
  const userInfo = {
    _id: existUser!._id,
    email: existUser!.email as string,
  };
  const accessToken = await JwtProvider.generateToken(
    userInfo,
    environmentConfig.ACCESS_TOKEN_SECRET_SIGNATURE,
    ms(environmentConfig.ACCESS_TOKEN_LIFE as StringValue) / 1000
  );
  const refreshToken = await JwtProvider.generateToken(
    userInfo,
    environmentConfig.REFRESH_TOKEN_SECRET_SIGNATURE,
    ms(environmentConfig.REFRESH_TOKEN_LIFE as StringValue) / 1000
  );
  return {
    ...pickUser(existUser),
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (clientRefreshToken: string) => {
  const refreshTokenDecoded = (await JwtProvider.verifyToken(
    clientRefreshToken,
    environmentConfig.REFRESH_TOKEN_SECRET_SIGNATURE
  )) as { _id: ObjectId; email: string };

  const userInfo = { _id: refreshTokenDecoded._id, email: refreshTokenDecoded.email };

  const accessToken = await JwtProvider.generateToken(
    userInfo,
    environmentConfig.ACCESS_TOKEN_SECRET_SIGNATURE,
    ms(environmentConfig.ACCESS_TOKEN_LIFE as StringValue) / 1000
  );

  return { accessToken };
};

export const userService = {
  createNew,
  verifyAccount,
  login,
  refreshToken,
};
