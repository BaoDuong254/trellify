import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { CreateNewCardType, UpdateCardType } from "@workspace/shared/schemas/card.schema";
import { BOARD_UPDATE_REASONS } from "@workspace/shared/utils/socket-events";

import { cardService } from "src/services/card.service";
import { broadcastBoardUpdate } from "src/sockets/board.broadcast";
import { actorId } from "src/utils/request-user";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const createdCard = await cardService.createNew(actorId(request), request.body as CreateNewCardType);
    response.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "Card created successfully",
      data: createdCard,
    });
    broadcastBoardUpdate(request, createdCard?.boardId, BOARD_UPDATE_REASONS.CARD_CREATED);
  } catch (error) {
    next(error);
  }
};

const update = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const cardId = request.params.id;
    const cardCoverFile = request.file;
    const userInfo = request.jwtDecoded as { _id: string; email: string };
    const updatedCard = await cardService.update(
      actorId(request),
      cardId as string,
      request.body as UpdateCardType,
      cardCoverFile,
      userInfo
    );
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Card updated successfully",
      data: updatedCard,
    });
    broadcastBoardUpdate(request, updatedCard?.boardId, BOARD_UPDATE_REASONS.CARD_UPDATED);
  } catch (error) {
    next(error);
  }
};

const deleteItem = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const cardId = (request.params.id as string) ?? "";
    const result = await cardService.deleteItem(actorId(request), cardId);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Card deleted successfully",
      data: result,
    });
    broadcastBoardUpdate(request, result.boardId, BOARD_UPDATE_REASONS.CARD_DELETED);
  } catch (error) {
    next(error);
  }
};

export const cardController = {
  createNew,
  update,
  deleteItem,
};
