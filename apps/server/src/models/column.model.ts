import { COLUMN_COLLECTION_SCHEMA, CreateNewColumnType } from "@workspace/shared/schemas/column.schema";
import { Document, ObjectId, UpdateFilter } from "mongodb";
import { GET_DB } from "src/config/database";

const COLUMN_COLLECTION_NAME = "columns";

const validateBeforeCreate = async (data: unknown) => {
  return await COLUMN_COLLECTION_SCHEMA.parseAsync(data);
};

const createNew = async (data: CreateNewColumnType) => {
  const validData = await validateBeforeCreate(data);
  const newColumnToAdd = {
    ...validData,
    boardId: new ObjectId(validData.boardId),
  };
  const createdColumn = await GET_DB().collection(COLUMN_COLLECTION_NAME).insertOne(newColumnToAdd);
  return createdColumn;
};

const fineOneById = async (id: ObjectId) => {
  const column = await GET_DB().collection(COLUMN_COLLECTION_NAME).findOne({ _id: id });
  return column;
};

const pushCardOrderIds = async (card) => {
  return await GET_DB()
    .collection(COLUMN_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(card.columnId as string) },
      { $push: { cardOrderIds: new ObjectId(card._id as string) } } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
};

export const columnModel = {
  COLUMN_COLLECTION_NAME,
  createNew,
  fineOneById,
  pushCardOrderIds,
};
