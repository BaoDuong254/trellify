import { Document, ObjectId, UpdateFilter } from "mongodb";

import { BOARD_COLLECTION_SCHEMA, CreateNewBoardType, UpdateBoardType } from "@workspace/shared/schemas/board.schema";

import { GET_DB } from "src/config/database";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { userModel } from "src/models/user.model";
import { pagingSkipValue } from "src/utils/paging";

const BOARD_COLLECTION_NAME = "boards";

const validateBeforeCreate = async (data: unknown) => {
  return await BOARD_COLLECTION_SCHEMA.parseAsync(data);
};

const INVALID_UPDATE_FIELDS = new Set(["_id", "createdAt"]);

const createNew = async (userId: string, data: CreateNewBoardType & { slug: string }) => {
  const validData = await validateBeforeCreate(data);
  const newBoardToAdd = {
    ...validData,
    ownerIds: [new ObjectId(userId)],
  };
  const createdBoard = await GET_DB().collection(BOARD_COLLECTION_NAME).insertOne(newBoardToAdd);
  return createdBoard;
};

const findOneById = async (id: ObjectId) => {
  const board = await GET_DB().collection(BOARD_COLLECTION_NAME).findOne({ _id: id });
  return board;
};

const getDetailsById = async (boardId: string) => {
  const queryConditions: Array<Record<string, unknown>> = [{ _id: new ObjectId(boardId) }, { _destroy: false }];

  const board = await GET_DB()
    .collection(BOARD_COLLECTION_NAME)
    .aggregate([
      { $match: { $and: queryConditions } },
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
      {
        $lookup: {
          from: userModel.USER_COLLECTION_NAME,
          localField: "ownerIds",
          foreignField: "_id",
          as: "owners",
          pipeline: [{ $project: { password: 0, verifyToken: 0 } }],
        },
      },
      {
        $lookup: {
          from: userModel.USER_COLLECTION_NAME,
          localField: "memberIds",
          foreignField: "_id",
          as: "members",
          pipeline: [{ $project: { password: 0, verifyToken: 0 } }],
        },
      },
    ])
    .toArray();
  return board[0] || null;
};

const findMembership = async (boardId: string) => {
  return await GET_DB()
    .collection(BOARD_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(boardId), _destroy: false }, { projection: { ownerIds: 1, memberIds: 1, type: 1 } });
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

const getBoards = async (userId: string, page: number, itemsPerPage: number, queryFilters?: Record<string, string>) => {
  const queryConditions: Array<Record<string, unknown>> = [
    { _destroy: false },
    { $or: [{ ownerIds: { $all: [new ObjectId(userId)] } }, { memberIds: { $all: [new ObjectId(userId)] } }] },
  ];

  if (queryFilters) {
    for (const [key, filterValue] of Object.entries(queryFilters)) {
      if (filterValue) {
        // eslint-disable-next-line security/detect-non-literal-regexp
        queryConditions.push({ [key]: { $regex: new RegExp(filterValue, "i") } });
      }
    }
  }

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

const pushMemberIds = async (boardId: string, userId: string) => {
  const result = await GET_DB()
    .collection(BOARD_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(boardId) },
      { $push: { memberIds: new ObjectId(userId) } } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
  return result;
};

const pullMemberIds = async (boardId: string, userId: string) => {
  const result = await GET_DB()
    .collection(BOARD_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(boardId) },
      { $pull: { memberIds: new ObjectId(userId) } } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
  return result;
};

export const boardModel = {
  BOARD_COLLECTION_NAME,
  createNew,
  findOneById,
  getDetailsById,
  findMembership,
  pushColumnOrderIds,
  update,
  pullColumnOrderIds,
  getBoards,
  pushMemberIds,
  pullMemberIds,
};
