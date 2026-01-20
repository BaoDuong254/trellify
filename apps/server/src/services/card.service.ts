import { CreateNewCardType } from "@workspace/shared/schemas/card.schema";
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

export const cardService = {
  createNew,
};
