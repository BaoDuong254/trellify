import {
  CreateNewBoardType,
  MoveCardToDifferentColumnType,
  UpdateBoardType,
} from "@workspace/shared/schemas/board.schema";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { boardService } from "src/services/board.service";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const userId = typeof request?.jwtDecoded === "object" ? (request.jwtDecoded._id.toString() as string) : undefined;
    const createdBoard = await boardService.createNew(userId!, request.body as CreateNewBoardType);
    response.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "Board created successfully",
      data: createdBoard,
    });
  } catch (error) {
    next(error);
  }
};

const getDetails = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const userId = typeof request?.jwtDecoded === "object" ? (request.jwtDecoded._id.toString() as string) : undefined;
    const boardId = (request.params.id as string) ?? "";
    const boardDetails = await boardService.getDetails(userId!, boardId);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Board details fetched successfully",
      data: boardDetails,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const boardId = (request.params.id as string) ?? "";
    const updatedBoard = await boardService.update(boardId, request.body as UpdateBoardType);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Board details fetched successfully",
      data: updatedBoard,
    });
  } catch (error) {
    next(error);
  }
};

const moveCardToDifferentColumn = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const result = await boardService.moveCardToDifferentColumn(request.body as MoveCardToDifferentColumnType);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Board details fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getBoards = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const userId = typeof request?.jwtDecoded === "object" ? (request.jwtDecoded._id.toString() as string) : undefined;
    const { page, itemsPerPage } = request.query;
    const titleSearch = request.query["q[title]"] as string | undefined;
    const queryFilters = titleSearch ? { title: titleSearch } : undefined;
    const boards = await boardService.getBoards(
      userId!,
      page as string | undefined,
      itemsPerPage as string | undefined,
      queryFilters
    );
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Boards fetched successfully",
      data: boards,
    });
  } catch (error) {
    next(error);
  }
};

export const boardController = {
  createNew,
  getDetails,
  update,
  moveCardToDifferentColumn,
  getBoards,
};
