import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import {
  CreateNewBoardType,
  MoveCardToDifferentColumnType,
  UpdateBoardType,
} from "@workspace/shared/schemas/board.schema";
import { BOARD_UPDATE_REASONS } from "@workspace/shared/utils/socket-events";

import { boardService } from "src/services/board.service";
import { broadcastBoardUpdate, evictUserFromBoardRoom } from "src/sockets/board/board.broadcast";
import { actorId } from "src/utils/request-user";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const userId = actorId(request);
    const createdBoard = await boardService.createNew(userId, request.body as CreateNewBoardType);
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
    const userId = actorId(request);
    const boardId = (request.params.id as string) ?? "";
    const boardDetails = await boardService.getDetails(userId, boardId);
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
    const updatedBoard = await boardService.update(actorId(request), boardId, request.body as UpdateBoardType);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Board details fetched successfully",
      data: updatedBoard,
    });
    broadcastBoardUpdate(request, boardId, BOARD_UPDATE_REASONS.BOARD_UPDATED);
  } catch (error) {
    next(error);
  }
};

const moveCardToDifferentColumn = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const result = await boardService.moveCardToDifferentColumn(
      actorId(request),
      request.body as MoveCardToDifferentColumnType
    );
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Board details fetched successfully",
      data: result,
    });
    broadcastBoardUpdate(request, result.boardId, BOARD_UPDATE_REASONS.CARD_MOVED);
  } catch (error) {
    next(error);
  }
};

const getBoards = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const userId = actorId(request);
    const { page, itemsPerPage } = request.query;
    const titleSearch = request.query["q[title]"] as string | undefined;
    const queryFilters = titleSearch ? { title: titleSearch } : undefined;
    const boards = await boardService.getBoards(
      userId,
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

const removeMember = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const actor = actorId(request);
    const boardId = (request.params.id as string) ?? "";
    const targetUserId = (request.params.userId as string) ?? "";
    const result = await boardService.removeMember(actor, boardId, targetUserId);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Member removed successfully",
      data: result,
    });
    // Eviction first: the removed user must stop receiving snapshots of this board.
    await evictUserFromBoardRoom(boardId, targetUserId);
    broadcastBoardUpdate(request, boardId, BOARD_UPDATE_REASONS.MEMBER_REMOVED);
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
  removeMember,
};
