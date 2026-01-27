import { CARD_COLLECTION_SCHEMA, CreateNewCardType, UpdateCardType } from "@workspace/shared/schemas/card.schema";
import { ObjectId } from "mongodb";
import { GET_DB } from "src/config/database";

const CARD_COLLECTION_NAME = "cards";

const validateBeforeCreate = async (data: unknown) => {
  return await CARD_COLLECTION_SCHEMA.parseAsync(data);
};

const INVALID_UPDATE_FIELDS = new Set(["_id", "createdAt", "boardId"]);

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

const update = async (
  cardId: string,
  updateData: UpdateCardType & {
    columnId?: string;
  }
) => {
  for (const field of Object.keys(updateData)) {
    if (INVALID_UPDATE_FIELDS.has(field)) {
      delete updateData[field];
    }
  }

  if (updateData.columnId) updateData.columnId = new ObjectId(updateData.columnId) as unknown as string;

  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .findOneAndUpdate({ _id: new ObjectId(cardId) }, { $set: updateData }, { returnDocument: "after" });
  return result;
};

const deleteManyByColumnId = async (columnId: string) => {
  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .deleteMany({ columnId: new ObjectId(columnId) });
  return result;
};

export const cardModel = {
  CARD_COLLECTION_NAME,
  createNew,
  fineOneById,
  update,
  deleteManyByColumnId,
};
