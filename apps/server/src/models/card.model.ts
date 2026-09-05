import { Document, FindCursor, ObjectId, UpdateFilter } from "mongodb";

import {
  CARD_COLLECTION_SCHEMA,
  CardCommentType,
  CreateNewCardType,
  IncomingCardMemberInfoType,
  UpdateCardType,
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

const deleteOneById = async (cardId: string) => {
  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .deleteOne({ _id: new ObjectId(cardId) });
  return result;
};

const deleteManyByColumnId = async (columnId: string) => {
  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .deleteMany({ columnId: new ObjectId(columnId) });
  return result;
};

const unshiftNewComment = async (cardId: string, commentData: CardCommentType) => {
  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $push: { comments: { $each: [commentData], $position: 0 } } } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
  return result;
};

const updateMembers = async (cardId: string, incomingMemberInfo: IncomingCardMemberInfoType) => {
  const updateCondition: Record<string, unknown> =
    incomingMemberInfo.action === CARD_MEMBER_ACTIONS.ADD
      ? { $push: { memberIds: new ObjectId(incomingMemberInfo.userId) } }
      : { $pull: { memberIds: new ObjectId(incomingMemberInfo.userId) } };

  const result = await GET_DB()
    .collection(CARD_COLLECTION_NAME)
    .findOneAndUpdate({ _id: new ObjectId(cardId) }, updateCondition, { returnDocument: "after" });
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
  update,
  deleteOneById,
  deleteManyByColumnId,
  unshiftNewComment,
  updateMembers,
  pullMemberFromBoardCards,
};
