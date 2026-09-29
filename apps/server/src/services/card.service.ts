import { StatusCodes } from "http-status-codes";
import { Document, ObjectId, WithId } from "mongodb";

import { CARD_ACTIVITY_TYPES } from "@workspace/shared/schemas/activity.schema";
import { CardCommentType, CreateNewCardType, UpdateCardType } from "@workspace/shared/schemas/card.schema";

import { CARD_BLOOM } from "src/config/bloom";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { addItem, isPossiblyPresent } from "src/providers/bloom.provider";
import { CloudinaryProvider } from "src/providers/cloudinary.provider";
import { scheduleDueReminder } from "src/queues/email/email.queue";
import { activityService } from "src/services/activity.service";
import { boardService } from "src/services/board.service";
import ApiError from "src/utils/api-error";
import { captureArchivedPosition, resolveRestorePosition } from "src/utils/order-position";

const assertCardAccess = async (userId: string, cardId: string) => {
  if (!(await isPossiblyPresent(CARD_BLOOM, cardId))) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Card not found!");
  }

  const card = await cardModel.findOneById(new ObjectId(cardId));
  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Card not found!");
  }
  await boardService.assertBoardAccess(userId, String(card.boardId));
  return card;
};

const createNew = async (userId: string, requestBody: CreateNewCardType) => {
  await boardService.assertBoardAccess(userId, requestBody.boardId);

  const newCard = {
    ...requestBody,
  };
  const createdCard = await cardModel.createNew(newCard);
  await addItem(CARD_BLOOM, String(createdCard.insertedId));
  const newlyCreatedCard = await cardModel.findOneById(createdCard.insertedId);
  if (newlyCreatedCard) {
    await columnModel.pushCardOrderIds(newlyCreatedCard);
    await activityService.record(newlyCreatedCard, userId, [{ type: CARD_ACTIVITY_TYPES.CARD_CREATED }]);
  }
  return newlyCreatedCard;
};

const setArchived = async (card: WithId<Document>, isArchived: boolean): Promise<WithId<Document> | null> => {
  const cardId = String(card._id);
  if (isArchived === Boolean(card.archivedAt)) return card;

  const column = await columnModel.findOneById(new ObjectId(String(card.columnId)));

  if (isArchived) {
    const updatedCard = await cardModel.update(cardId, {
      archivedAt: new Date(),
      archivedPosition: captureArchivedPosition(column?.cardOrderIds, card._id),
      updatedAt: new Date(),
    });
    await columnModel.pullCardOrderIds(card);
    return updatedCard;
  }

  if (!column || column.archivedAt) {
    throw new ApiError(StatusCodes.CONFLICT, "Error.ColumnUnavailable");
  }
  const position = resolveRestorePosition(column.cardOrderIds, card.archivedPosition);
  const updatedCard = await cardModel.update(cardId, {
    archivedAt: null,
    archivedPosition: null,
    updatedAt: new Date(),
  });
  await columnModel.insertCardOrderId(String(column._id), cardId, position);
  return updatedCard;
};

const update = async (
  userId: string,
  cardId: string,
  requestBody: UpdateCardType,
  cardCoverFile?: Express.Multer.File,
  userInfo?: { _id: string; email: string }
) => {
  const card = await assertCardAccess(userId, cardId);

  const changes = activityService.describeCardChanges(card, requestBody, Boolean(cardCoverFile));
  const { commentToAdd, commentToUpdate, commentToDelete, incomingMemberInfo, archived, ...fields } = requestBody;
  let updatedCard: WithId<Document> | null;
  if (cardCoverFile) {
    const uploadResult = (await CloudinaryProvider.streamUpload(cardCoverFile.buffer, "trellify_card-covers")) as {
      secure_url: string;
    };
    updatedCard = await cardModel.update(cardId, { cover: uploadResult.secure_url, updatedAt: new Date() });
  } else if (commentToAdd) {
    const commentData = {
      ...commentToAdd,
      _id: new ObjectId().toString(),
      commentedAt: new Date(),
      userId: userInfo?._id,
      userEmail: userInfo?.email,
    } as CardCommentType;
    updatedCard = await cardModel.unshiftNewComment(cardId, commentData);
  } else if (commentToUpdate) {
    updatedCard = await cardModel.updateOwnComment(cardId, commentToUpdate._id, userId, commentToUpdate.content);
    if (!updatedCard) throw new ApiError(StatusCodes.NOT_FOUND, "Error.CommentNotFound");
  } else if (commentToDelete) {
    updatedCard = await cardModel.deleteOwnComment(cardId, commentToDelete._id, userId);
    if (!updatedCard) throw new ApiError(StatusCodes.NOT_FOUND, "Error.CommentNotFound");
  } else if (archived !== undefined) {
    updatedCard = await setArchived(card, archived);
  } else if (incomingMemberInfo) {
    updatedCard = await cardModel.updateMembers(cardId, incomingMemberInfo);
  } else {
    updatedCard = await cardModel.update(cardId, { ...fields, updatedAt: new Date() });
  }
  if (updatedCard) await activityService.record(card, userId, changes);
  if (updatedCard && fields.dueDate) await scheduleDueReminder(cardId, fields.dueDate);
  return updatedCard;
};

const getComments = async (userId: string, cardId: string): Promise<unknown[]> => {
  const card = await assertCardAccess(userId, cardId);
  return Array.isArray(card.comments) ? card.comments : [];
};

const getActivities = async (userId: string, cardId: string) => {
  await assertCardAccess(userId, cardId);
  return await activityService.getByCard(cardId);
};

const deleteItem = async (userId: string, cardId: string) => {
  const targetCard = await assertCardAccess(userId, cardId);

  await cardModel.deleteOneById(cardId);
  await columnModel.pullCardOrderIds(targetCard);

  return {
    deleteResult: "Card deleted successfully",
    boardId: targetCard.boardId?.toString() as string | undefined,
  };
};

export const cardService = {
  createNew,
  update,
  getComments,
  getActivities,
  deleteItem,
};
