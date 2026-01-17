import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

const createNew = async (_request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    response.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "Board created successfully",
    });
    next();
  } catch (error) {
    next(error);
  }
};

export const boardController = {
  createNew,
};
