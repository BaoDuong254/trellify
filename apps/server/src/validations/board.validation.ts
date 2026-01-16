import { z } from "zod";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

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
    response.status(StatusCodes.CREATED).json({
      message: "Board created successfully",
      status: StatusCodes.CREATED,
    });
    next();
  } catch (error) {
    response.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      message: "Invalid data provided",
      status: StatusCodes.UNPROCESSABLE_ENTITY,
      errors: error instanceof z.ZodError ? error.issues : [error instanceof Error ? error.message : String(error)],
    });
  }
};

export const boardValidation = {
  createNew,
};
