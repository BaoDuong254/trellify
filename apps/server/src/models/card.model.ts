import { CARD_COLLECTION_SCHEMA, CreateNewCardType } from "@workspace/shared/schemas/card.schema";
import { ObjectId } from "mongodb";
import { GET_DB } from "src/config/database";

const CARD_COLLECTION_NAME = "cards";

const validateBeforeCreate = async (data: unknown) => {
  return await CARD_COLLECTION_SCHEMA.parseAsync(data);
};

const createNew = async (data: CreateNewCardType) => {
  const validData = await validateBeforeCreate(data);
  const newCardToAdd = {
    ...validData,
    boardId: new ObjectId(validData.boardId),
    columnId: new ObjectId(validData.columnId),
  };
  const createdCard = await GET_DB().collection(CARD_COLLECTION_NAME).insertOne(newCardToAdd);
  return createdCard;
};

const fineOneById = async (id: ObjectId) => {
  const card = await GET_DB().collection(CARD_COLLECTION_NAME).findOne({ _id: id });
  return card;
};

export const cardModel = {
  CARD_COLLECTION_NAME,
  createNew,
  fineOneById,
};
