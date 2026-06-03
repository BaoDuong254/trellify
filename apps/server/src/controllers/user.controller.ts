import { StatusCodes } from "http-status-codes";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { userService } from "src/services/user.service";
import {
  UserForgotPasswordType,
  UserLoginType,
  UserRegistrationType,
  UserResetPasswordType,
  UserUpdateType,
  UserVerificationType,
} from "@workspace/shared/schemas/user.schema";
import ms, { StringValue } from "ms";
import environmentConfig from "src/config/environment";
import ApiError from "src/utils/api-error";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const createdUser = await userService.createNew(request.body as UserRegistrationType);
    response.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "User created successfully",
      data: createdUser,
    });
  } catch (error) {
    next(error);
  }
};

const verifyAccount = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const verifiedUser = await userService.verifyAccount(request.body as UserVerificationType);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "User account verified successfully",
      data: verifiedUser,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const result = await userService.login(request.body as UserLoginType);
    response.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: ms(environmentConfig.COOKIE_MAX_AGE as StringValue),
    });
    response.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: ms(environmentConfig.COOKIE_MAX_AGE as StringValue),
    });
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "User logged in successfully",
      data: result.user,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (_request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    response.clearCookie("accessToken");
    response.clearCookie("refreshToken");
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "User logged out successfully",
      data: {
        loggedOut: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const result = await userService.refreshToken(request?.cookies?.refreshToken as string);
    response.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: ms(environmentConfig.COOKIE_MAX_AGE as StringValue),
    });
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Access token refreshed successfully",
    });
  } catch {
    next(new ApiError(StatusCodes.FORBIDDEN, "Please login again."));
  }
};

const update = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const userId = typeof request?.jwtDecoded === "object" ? (request.jwtDecoded._id.toString() as string) : undefined;
    const userAvatarFile = request.file;
    const updatedUser = await userService.update(userId!, request.body as UserUpdateType, userAvatarFile);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    await userService.forgotPassword(request.body as UserForgotPasswordType);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "If this email is registered, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    await userService.resetPassword(request.body as UserResetPasswordType);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const userController = {
  createNew,
  verifyAccount,
  login,
  logout,
  refreshToken,
  update,
  forgotPassword,
  resetPassword,
};
