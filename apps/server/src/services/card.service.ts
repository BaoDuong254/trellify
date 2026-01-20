import { CreateNewCardType } from "@workspace/shared/schemas/card.schema";
import { cardModel } from "src/models/card.model";

const createNew = async (requestBody: CreateNewCardType) => {
  const newCard = {
    ...requestBody,
  };
  const createdCard = await cardModel.createNew(newCard);
  const getNewlyCreatedCard = await cardModel.fineOneById(createdCard.insertedId);
  return getNewlyCreatedCard;
};

export const cardService = {
  createNew,
};
