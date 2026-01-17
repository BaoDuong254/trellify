import { z } from "zod";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import ApiError from "src/utils/api-error";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  const correctConditions = z.object({
    title: z
      .string({ error: "Error.TitleMustBeString" })
      .min(3, { error: "Error.TitleTooShort" })
      .max(50, { error: "Error.TitleTooLong" })
      .trim(),
    description: z
      .string({ error: "Error.DescriptionMustBeString" })
      .min(3, { error: "Error.DescriptionTooShort" })
      .max(256, { error: "Error.DescriptionTooLong" })
      .trim(),
  });
  try {
    await correctConditions.parseAsync(request.body);
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const customError = new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errorMessage);
    next(customError);
  }
};

export const boardValidation = {
  createNew,
};
