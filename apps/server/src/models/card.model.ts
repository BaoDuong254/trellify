import { Document, FindCursor, ObjectId, UpdateFilter } from "mongodb";

import {
  CARD_COLLECTION_SCHEMA,
  CardCommentType,
  CardPatchType,
  CreateNewCardType,
  IncomingCardMemberInfoType,
} from "@workspace/shared/schemas/card.schema";
import { CARD_MEMBER_ACTIONS } from "@workspace/shared/utils/constants";

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

const findAllIds = (): FindCursor<{ _id: ObjectId }> =>
  GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .find({}, { projection: { _id: 1 } }) as unknown as FindCursor<{ _id: ObjectId }>;

const countAll = async (): Promise<number> => GET_DB().collection(CARD_COLLECTION_NAME).countDocuments({});

const findOneById = async (id: ObjectId) => {
  const card = await GET_DB().collection(CARD_COLLECTION_NAME).findOne({ _id: id, _destroy: false });
  return card;
};

const update = async (cardId: string, updateData: CardPatchType) => {
  for (const field of Object.keys(updateData)) {
    if (INVALID_UPDATE_FIELDS.has(field)) {
      delete updateData[field];
    }
  }

  if (updateData.columnId) updateData.columnId = new ObjectId(updateData.columnId) as unknown as string;

  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(cardId), _destroy: false },
      { $set: updateData },
      { returnDocument: "after" }
    );
  return result;
};

const deleteOneById = async (cardId: string) => {
  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(cardId) }, { $set: { _destroy: true, updatedAt: new Date() } });
  return result;
};

const deleteManyByBoardId = async (boardId: string) => {
  return await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .updateMany(
      { boardId: new ObjectId(boardId), _destroy: false },
      { $set: { _destroy: true, updatedAt: new Date() } }
    );
};

const backfillCommentIds = async (cardId: string, previous: Document[], next: Document[]) => {
  return await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(cardId), _destroy: false, comments: previous }, { $set: { comments: next } });
};

const deleteManyByColumnId = async (columnId: string) => {
  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .updateMany({ columnId: new ObjectId(columnId) }, { $set: { _destroy: true, updatedAt: new Date() } });
  return result;
};

const findArchivedByBoard = async (boardId: string) => {
  return await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .find(
      { boardId: new ObjectId(boardId), _destroy: false, archivedAt: { $type: "date" } },
      { projection: { title: 1, columnId: 1, archivedAt: 1 } }
    )
    .sort({ archivedAt: -1 })
    .limit(100)
    .toArray();
};

const unshiftNewComment = async (cardId: string, commentData: CardCommentType) => {
  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(cardId), _destroy: false },
      {
        $push: { comments: { $each: [commentData], $position: 0 } },
        $set: { updatedAt: new Date() },
      } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
  return result;
};

const updateOwnComment = async (cardId: string, commentId: string, userId: string, content: string) => {
  return await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(cardId), _destroy: false, comments: { $elemMatch: { _id: commentId, userId } } },
      { $set: { "comments.$.content": content, "comments.$.editedAt": new Date(), updatedAt: new Date() } },
      { returnDocument: "after" }
    );
};

const deleteOwnComment = async (cardId: string, commentId: string, userId: string) => {
  return await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(cardId), _destroy: false, comments: { $elemMatch: { _id: commentId, userId } } },
      {
        $pull: { comments: { _id: commentId, userId } },
        $set: { updatedAt: new Date() },
      } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
};

const updateMembers = async (cardId: string, incomingMemberInfo: IncomingCardMemberInfoType) => {
  const updateCondition: Record<string, unknown> =
    incomingMemberInfo.action === CARD_MEMBER_ACTIONS.ADD
      ? { $addToSet: { memberIds: new ObjectId(incomingMemberInfo.userId) }, $set: { updatedAt: new Date() } }
      : { $pull: { memberIds: new ObjectId(incomingMemberInfo.userId) }, $set: { updatedAt: new Date() } };

  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .findOneAndUpdate({ _id: new ObjectId(cardId), _destroy: false }, updateCondition, { returnDocument: "after" });
  return result;
};

const pullMemberFromBoardCards = async (boardId: string, userId: string) => {
  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .updateMany({ boardId: new ObjectId(boardId), memberIds: new ObjectId(userId), _destroy: false }, {
      $pull: { memberIds: new ObjectId(userId) },
    } as unknown as UpdateFilter<Document>);
  return result;
};

export const cardModel = {
  CARD_COLLECTION_NAME,
  createNew,
  findAllIds,
  countAll,
  findOneById,
  findArchivedByBoard,
  update,
  deleteOneById,
  deleteManyByColumnId,
  deleteManyByBoardId,
  backfillCommentIds,
  unshiftNewComment,
  updateOwnComment,
  deleteOwnComment,
  updateMembers,
  pullMemberFromBoardCards,
};
