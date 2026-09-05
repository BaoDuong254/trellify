import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";

import { CardCommentType, CreateNewCardType, UpdateCardType } from "@workspace/shared/schemas/card.schema";

import { CARD_BLOOM } from "src/config/bloom";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { addItem, isPossiblyPresent } from "src/providers/bloom.provider";
import { CloudinaryProvider } from "src/providers/cloudinary.provider";
import { boardService } from "src/services/board.service";
import ApiError from "src/utils/api-error";

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
  }
  return newlyCreatedCard;
};

const update = async (
  userId: string,
  cardId: string,
  requestBody: UpdateCardType,
  cardCoverFile?: Express.Multer.File,
  userInfo?: { _id: string; email: string }
) => {
  await assertCardAccess(userId, cardId);

  const updatedData = {
    ...requestBody,
    updatedAt: new Date(),
  };
  let updatedCard: UpdateCardType;
  if (cardCoverFile) {
    const uploadResult = (await CloudinaryProvider.streamUpload(cardCoverFile.buffer, "trellify_card-covers")) as {
      secure_url: string;
    };
    updatedCard = (await cardModel.update(cardId, {
      cover: uploadResult.secure_url,
    })) as unknown as UpdateCardType;
  } else if (updatedData.commentToAdd) {
    const commentData = {
      ...updatedData.commentToAdd,
      commentedAt: new Date(),
      userId: userInfo?._id,
      userEmail: userInfo?.email,
    } as CardCommentType;
    updatedCard = (await cardModel.unshiftNewComment(cardId, commentData)) as unknown as UpdateCardType;
  } else if (updatedData.incomingMemberInfo) {
    updatedCard = (await cardModel.updateMembers(cardId, updatedData.incomingMemberInfo)) as unknown as UpdateCardType;
  } else {
    updatedCard = (await cardModel.update(cardId, updatedData)) as unknown as UpdateCardType;
  }
  return updatedCard;
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
  deleteItem,
};
