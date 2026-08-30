import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { CreateNewColumnType, UpdateColumnType } from "@workspace/shared/schemas/column.schema";
import { BOARD_UPDATE_REASONS } from "@workspace/shared/utils/socket-events";

import { columnService } from "src/services/column.service";
import { broadcastBoardUpdate } from "src/sockets/board.broadcast";
import { actorId } from "src/utils/request-user";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const createdColumn = await columnService.createNew(actorId(request), request.body as CreateNewColumnType);
    response.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "Column created successfully",
      data: createdColumn,
    });
    broadcastBoardUpdate(request, createdColumn?.boardId, BOARD_UPDATE_REASONS.COLUMN_CREATED);
  } catch (error) {
    next(error);
  }
};

const update = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const columnId = (request.params.id as string) ?? "";
    const updatedColumn = await columnService.update(actorId(request), columnId, request.body as UpdateColumnType);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Column details fetched successfully",
      data: updatedColumn,
    });
    broadcastBoardUpdate(request, updatedColumn?.boardId, BOARD_UPDATE_REASONS.COLUMN_UPDATED);
  } catch (error) {
    next(error);
  }
};

const deleteItem = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const columnId = (request.params.id as string) ?? "";
    const result = await columnService.deleteItem(actorId(request), columnId);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Column deleted successfully",
      data: result,
    });
    broadcastBoardUpdate(request, result.boardId, BOARD_UPDATE_REASONS.COLUMN_DELETED);
  } catch (error) {
    next(error);
  }
};

export const columnController = {
  createNew,
  update,
  deleteItem,
};
