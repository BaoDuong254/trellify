import { CreateNewCardType } from "@workspace/shared/schemas/card.schema";
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

export const cardController = {
  createNew,
};
