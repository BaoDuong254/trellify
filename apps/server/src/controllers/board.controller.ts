import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    response.status(StatusCodes.CREATED).json({
      message: "Board created successfully",
      status: StatusCodes.CREATED,
    });
    next();
  } catch (error) {
    response.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while creating the board",
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      errors: [error instanceof Error ? error.message : String(error)],
    });
  }
};

export const boardController = {
  createNew,
};
