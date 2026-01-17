import { BOARD_COLLECTION_SCHEMA, CreateNewBoardType } from "@workspace/shared/schemas/board.schema";
import { ObjectId } from "mongodb";
import { GET_DB } from "src/config/database";

const BOARD_COLLECTION_NAME = "boards";

const validateBeforeCreate = async (data: unknown) => {
  return await BOARD_COLLECTION_SCHEMA.parseAsync(data);
};

const createNew = async (data: CreateNewBoardType & { slug: string }) => {
  try {
    const validData = await validateBeforeCreate(data);
    const createdBoard = await GET_DB().collection(BOARD_COLLECTION_NAME).insertOne(validData);
    return createdBoard;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

const fineOneById = async (id: ObjectId) => {
  try {
    const board = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({ _id: id });
    return board;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

export const boardModel = {
  BOARD_COLLECTION_NAME,
  createNew,
  fineOneById,
};
