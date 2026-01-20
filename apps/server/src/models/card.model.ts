import { CARD_COLLECTION_SCHEMA, CreateNewCardType } from "@workspace/shared/schemas/card.schema";
import { ObjectId } from "mongodb";
import { GET_DB } from "src/config/database";

const CARD_COLLECTION_NAME = "cards";

const validateBeforeCreate = async (data: unknown) => {
  return await CARD_COLLECTION_SCHEMA.parseAsync(data);
};

const createNew = async (data: CreateNewCardType) => {
  const validData = await validateBeforeCreate(data);
  const createdBoard = await GET_DB().collection(CARD_COLLECTION_NAME).insertOne(validData);
  return createdBoard;
};

const fineOneById = async (id: ObjectId) => {
  const board = await GET_DB().collection(CARD_COLLECTION_NAME).findOne({ _id: id });
  return board;
};

export const cardModel = {
  CARD_COLLECTION_NAME,
  createNew,
  fineOneById,
};
