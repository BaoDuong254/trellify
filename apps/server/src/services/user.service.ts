import { createHash } from "node:crypto";

import bcryptjs from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import ms, { StringValue } from "ms";
import { v4 as uuidv4 } from "uuid";

import {
  UserForgotPasswordType,
  UserLoginType,
  UserRegistrationType,
  UserResetPasswordType,
  UserUpdateType,
  UserVerificationType,
} from "@workspace/shared/schemas/user.schema";

import environmentConfig from "src/config/environment";
import { userModel } from "src/models/user.model";
import { BrevoProvider } from "src/providers/brevo.provider";
import { CloudinaryProvider } from "src/providers/cloudinary.provider";
import { JwtProvider } from "src/providers/jwt.provider";
import { QUEUE_NAMES, userQueue } from "src/queues/user.queue";
import ApiError from "src/utils/api-error";
import { pickUser } from "src/utils/formatters";
import { checkRateLimit } from "src/utils/rate-limiter";

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

  await userQueue.add(
    QUEUE_NAMES.DELETE_UNVERIFIED_USER,
    { userId: createdUser.insertedId.toString() },
    {
      delay: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

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
    user: pickUser(existUser),
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

const update = async (userId: string, requestBody: UserUpdateType, userAvatarFile?: Express.Multer.File) => {
  const existUser = await userModel.findOneById(userId);
  if (!existUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  if (!existUser!.isActive) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Account is not active");
  }
  let updatedUser: unknown;

  if (requestBody.current_password && requestBody.new_password) {
    if (!bcryptjs.compareSync(requestBody.current_password, existUser.password as string)) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Your Current Password is incorrect!");
    }
    updatedUser = (await userModel.update(existUser._id.toString(), {
      password: bcryptjs.hashSync(requestBody.new_password, 10),
    })) as unknown as UserUpdateType;
  } else if (userAvatarFile) {
    const uploadResult = (await CloudinaryProvider.streamUpload(userAvatarFile.buffer, "trellify_users")) as {
      secure_url: string;
    };
    const result = await userModel.update(existUser._id.toString(), {
      avatar: uploadResult.secure_url,
    });
    updatedUser = result ?? {};
  } else {
    updatedUser = (await userModel.update(existUser._id.toString(), requestBody)) as unknown as UserUpdateType;
  }

  return pickUser(updatedUser);
};

const forgotPassword = async (requestBody: UserForgotPasswordType): Promise<void> => {
  const { email } = requestBody;

  const WINDOW_SEC = 15 * 60; // 15 minutes in seconds
  await checkRateLimit(`rl:fp:email:${email}`, 3, WINDOW_SEC);

  const existUser = await userModel.findOneByEmail(email);
  if (!existUser || !existUser.isActive) return;

  const rawToken = uuidv4();
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");
  const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

  await userModel.update(existUser._id.toString(), {
    verifyToken: hashedToken,
    verifyTokenExpiry: tokenExpiry,
    updatedAt: new Date(),
  });

  const resetLink = `${environmentConfig.CLIENT_URL}/reset-password?token=${rawToken}`;
  const subject = "Trellify - Reset your password";
  const htmlContent = `
    <h1>Trellify - Password Reset</h1>
    <p>We received a request to reset your Trellify account password.</p>
    <p>Click the link below to set a new password (expires in 15 minutes):</p>
    <a href="${resetLink}">Reset Password</a>
    <p>If you did not request a password reset, please ignore this email.</p>
    <p>Best regards,<br/>The Trellify Team</p>
  `;
  await BrevoProvider.sendEmail(email, subject, htmlContent);
};

const resetPassword = async (requestBody: UserResetPasswordType): Promise<void> => {
  const { token, password } = requestBody;

  const hashedToken = createHash("sha256").update(token).digest("hex");
  const existUser = await userModel.findOneByVerifyToken(hashedToken);
  if (!existUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid or expired reset token.");
  }

  await userModel.update(existUser._id.toString(), {
    password: bcryptjs.hashSync(password, 10),
    verifyToken: null,
    verifyTokenExpiry: null,
    updatedAt: new Date(),
  });
};

export const userService = {
  createNew,
  verifyAccount,
  login,
  refreshToken,
  update,
  forgotPassword,
  resetPassword,
};
