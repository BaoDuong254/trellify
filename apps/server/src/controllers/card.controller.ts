import { CreateNewCardType, UpdateCardType } from "@workspace/shared/schemas/card.schema";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { cardService } from "src/services/card.service";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const createdCard = await cardService.createNew(request.body as CreateNewCardType);
    response.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "Card created successfully",
      data: createdCard,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const cardId = request.params.id;
    const cardCoverFile = request.file;
    const updatedCard = await cardService.update(cardId as string, request.body as UpdateCardType, cardCoverFile);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Card updated successfully",
      data: updatedCard,
    });
  } catch (error) {
    next(error);
  }
};

export const cardController = {
  createNew,
  update,
};
