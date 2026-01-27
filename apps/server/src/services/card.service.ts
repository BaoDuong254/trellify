import { CreateNewCardType, UpdateCardType } from "@workspace/shared/schemas/card.schema";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";

const createNew = async (requestBody: CreateNewCardType) => {
  const newCard = {
    ...requestBody,
  };
  const createdCard = await cardModel.createNew(newCard);
  const getNewlyCreatedCard = await cardModel.fineOneById(createdCard.insertedId);
  if (getNewlyCreatedCard) {
    await columnModel.pushCardOrderIds(getNewlyCreatedCard);
  }
  return getNewlyCreatedCard;
};

const update = async (cardId: string, requestBody: UpdateCardType) => {
  const updatedCard = {
    ...requestBody,
    updatedAt: new Date(),
  };
  const result = await cardModel.update(cardId, updatedCard);
  return result;
};

export const cardService = {
  createNew,
  update,
};
