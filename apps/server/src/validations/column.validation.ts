import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import ApiError from "src/utils/api-error";
import { CREATE_NEW_COLUMN_SCHEMA, UPDATE_COLUMN_SCHEMA } from "@workspace/shared/schemas/column.schema";

const createNew = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  try {
    await CREATE_NEW_COLUMN_SCHEMA.parseAsync(request.body);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage);
    next(customError);
  }
};

const update = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  try {
    await UPDATE_COLUMN_SCHEMA.parseAsync(request.body);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage);
    next(customError);
  }
};

export const columnValidation = {
  createNew,
  update,
};
