import { StatusCodes } from "http-status-codes";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { userService } from "src/services/user.service";
import { UserLoginType, UserRegistrationType, UserVerificationType } from "@workspace/shared/schemas/user.schema";
import ms, { StringValue } from "ms";
import environmentConfig from "src/config/environment";

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
    const loggedInUser = await userService.login(request.body as UserLoginType);
    response.cookie("accessToken", loggedInUser.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: ms(environmentConfig.COOKIE_MAX_AGE as StringValue),
    });
    response.cookie("refreshToken", loggedInUser.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: ms(environmentConfig.COOKIE_MAX_AGE as StringValue),
    });
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "User logged in successfully",
      data: loggedInUser,
    });
  } catch (error) {
    next(error);
  }
};

export const userController = {
  createNew,
  verifyAccount,
  login,
};
