import { BOARD_COLLECTION_SCHEMA, CreateNewBoardType, UpdateBoardType } from "@workspace/shared/schemas/board.schema";
import { ObjectId, UpdateFilter, Document } from "mongodb";
import { GET_DB } from "src/config/database";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { pagingSkipValue } from "src/utils/paging";

const BOARD_COLLECTION_NAME = "boards";

const validateBeforeCreate = async (data: unknown) => {
  return await BOARD_COLLECTION_SCHEMA.parseAsync(data);
};

const INVALID_UPDATE_FIELDS = new Set(["_id", "createdAt"]);

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

const pushColumnOrderIds = async (column) => {
  return await GET_DB()
    .collection(BOARD_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(column.boardId as string) },
      { $push: { columnOrderIds: new ObjectId(column._id as string) } } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
};

const pullColumnOrderIds = async (column) => {
  const result = await GET_DB()
    .collection(BOARD_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(column.boardId as string) },
      { $pull: { columnOrderIds: new ObjectId(column._id as string) } } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
  return result;
};

const update = async (boardId: string, updateData: UpdateBoardType) => {
  for (const field of Object.keys(updateData)) {
    if (INVALID_UPDATE_FIELDS.has(field)) {
      delete updateData[field];
    }
  }
  if (updateData.columnOrderIds) {
    updateData.columnOrderIds = updateData.columnOrderIds.map((_id) => new ObjectId(_id)) as unknown as string[];
  }
  return await GET_DB()
    .collection(BOARD_COLLECTION_NAME)
    .findOneAndUpdate({ _id: new ObjectId(boardId) }, { $set: updateData }, { returnDocument: "after" });
};

const getBoards = async (userId: string, page: number, itemsPerPage: number) => {
  const queryConditions = [
    { _destroy: false },
    { $or: [{ ownerIds: { $all: [new ObjectId(userId)] } }, { memberIds: { $all: [new ObjectId(userId)] } }] },
  ];

  const query = await GET_DB()
    .collection(BOARD_COLLECTION_NAME)
    .aggregate(
      [
        { $match: { $and: queryConditions } },
        { $sort: { title: 1 } },
        {
          $facet: {
            queryBoards: [{ $skip: pagingSkipValue(page, itemsPerPage) }, { $limit: itemsPerPage }],
            queryTotalBoards: [{ $count: "countedAllBoards" }],
          },
        },
      ],
      { collation: { locale: "en" } }
    )
    .toArray();

  const result = query[0];
  return {
    boards: result?.queryBoards || [],
    totalBoards: result?.queryTotalBoards[0]?.countedAllBoards || 0,
  };
};

export const boardModel = {
  BOARD_COLLECTION_NAME,
  createNew,
  fineOneById,
  getDetails,
  pushColumnOrderIds,
  update,
  pullColumnOrderIds,
  getBoards,
};
