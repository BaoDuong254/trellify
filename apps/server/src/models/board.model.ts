import { BOARD_COLLECTION_SCHEMA, CreateNewBoardType } from "@workspace/shared/schemas/board.schema";
import { ObjectId } from "mongodb";
import { GET_DB } from "src/config/database";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";

const BOARD_COLLECTION_NAME = "boards";

const validateBeforeCreate = async (data: unknown) => {
  return await BOARD_COLLECTION_SCHEMA.parseAsync(data);
};

const createNew = async (data: CreateNewBoardType & { slug: string }) => {
  const validData = await validateBeforeCreate(data);
  const createdBoard = await GET_DB().collection(BOARD_COLLECTION_NAME).insertOne(validData);
  return createdBoard;
};

const fineOneById = async (id: ObjectId) => {
  const board = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({ _id: id });
  return board;
};

const getDetails = async (boardId: string) => {
  const board = await GET_DB()
    .collection(BOARD_COLLECTION_NAME)
    .aggregate([
      {
        $match: {
          _id: new ObjectId(boardId),
          _destroy: false,
        },
      },
      {
        $lookup: {
          from: columnModel.COLUMN_COLLECTION_NAME,
          localField: "_id",
          foreignField: "boardId",
          as: "columns",
        },
      },
      {
        $lookup: {
          from: cardModel.CARD_COLLECTION_NAME,
          localField: "_id",
          foreignField: "boardId",
          as: "cards",
        },
      },
    ])
    .toArray();
  return board[0] || null;
};

export const boardModel = {
  BOARD_COLLECTION_NAME,
  createNew,
  fineOneById,
  getDetails,
};
