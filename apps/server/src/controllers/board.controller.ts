import { CreateNewBoardType } from "@workspace/shared/schemas/board.schema";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { boardService } from "src/services/board.service";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const createdBoard = await boardService.createNew(request.body as CreateNewBoardType);
    response.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "Board created successfully",
      data: createdBoard,
    });
  } catch (error) {
    next(error);
  }
};

export const boardController = {
  createNew,
};
