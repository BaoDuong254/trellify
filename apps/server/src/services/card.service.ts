import { CardCommentType, CreateNewCardType, UpdateCardType } from "@workspace/shared/schemas/card.schema";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { CloudinaryProvider } from "src/providers/cloudinary.provider";

const createNew = async (requestBody: CreateNewCardType) => {
  const newCard = {
    ...requestBody,
  };
  const createdCard = await cardModel.createNew(newCard);
  const getNewlyCreatedCard = await cardModel.findOneById(createdCard.insertedId);
  if (getNewlyCreatedCard) {
    await columnModel.pushCardOrderIds(getNewlyCreatedCard);
  }
  return getNewlyCreatedCard;
};

const update = async (
  cardId: string,
  requestBody: UpdateCardType,
  cardCoverFile?: Express.Multer.File,
  userInfo?: { _id: string; email: string }
) => {
  const updatedData = {
    ...requestBody,
    updatedAt: new Date(),
  };
  let updatedCard = {};
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

export const cardService = {
  createNew,
  update,
};
