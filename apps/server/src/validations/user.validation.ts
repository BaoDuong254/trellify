import { USER_REGISTRATION_SCHEMA } from "./../../../../packages/shared/src/schemas/user.schema";
import { StatusCodes } from "http-status-codes";
import ApiError from "src/utils/api-error";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";

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

export const userValidation = {
  createNew,
};
