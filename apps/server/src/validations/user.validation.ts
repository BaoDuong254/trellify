import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import {
  USER_FORGOT_PASSWORD_SCHEMA,
  USER_LOGIN_SCHEMA,
  USER_REGISTRATION_SCHEMA,
  USER_RESET_PASSWORD_SCHEMA,
  USER_UPDATE_SCHEMA,
  USER_VERIFICATION_SCHEMA,
} from "@workspace/shared/schemas/user.schema";

import ApiError from "src/utils/api-error";

const createNew = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  try {
    await USER_REGISTRATION_SCHEMA.parseAsync(request.body);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage);
    next(customError);
  }
};

const verifyAccount = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  try {
    await USER_VERIFICATION_SCHEMA.parseAsync(request.body);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage);
    next(customError);
  }
};

const login = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  try {
    await USER_LOGIN_SCHEMA.parseAsync(request.body);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage);
    next(customError);
  }
};

const update = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  try {
    await USER_UPDATE_SCHEMA.parseAsync(request.body);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage);
    next(customError);
  }
};

const forgotPassword = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  try {
    await USER_FORGOT_PASSWORD_SCHEMA.parseAsync(request.body);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage));
  }
};

const resetPassword = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  try {
    await USER_RESET_PASSWORD_SCHEMA.parseAsync(request.body);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage));
  }
};

export const userValidation = {
  createNew,
  verifyAccount,
  login,
  update,
  forgotPassword,
  resetPassword,
};
