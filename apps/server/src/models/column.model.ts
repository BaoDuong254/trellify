import { COLUMN_COLLECTION_SCHEMA, CreateNewColumnType } from "@workspace/shared/schemas/column.schema";
import { ObjectId } from "mongodb";
import { GET_DB } from "src/config/database";

const COLUMN_COLLECTION_NAME = "columns";

const validateBeforeCreate = async (data: unknown) => {
  return await COLUMN_COLLECTION_SCHEMA.parseAsync(data);
};

const createNew = async (data: CreateNewColumnType) => {
  const validData = await validateBeforeCreate(data);
  const createdBoard = await GET_DB().collection(COLUMN_COLLECTION_NAME).insertOne(validData);
  return createdBoard;
};

const fineOneById = async (id: ObjectId) => {
  const board = await GET_DB().collection(COLUMN_COLLECTION_NAME).findOne({ _id: id });
  return board;
};

export const columnModel = {
  COLUMN_COLLECTION_NAME,
  createNew,
  fineOneById,
};
