import { StatusCodes } from "http-status-codes";
import ApiError from "src/utils/api-error";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import {
  USER_LOGIN_SCHEMA,
  USER_REGISTRATION_SCHEMA,
  USER_VERIFICATION_SCHEMA,
} from "@workspace/shared/schemas/user.schema";

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

export const userValidation = {
  createNew,
  verifyAccount,
  login,
};
