import {
  INVITATION_COLLECTION_SCHEMA,
  InvitationCreateServiceType,
  InvitationUpdateType,
} from "@workspace/shared/schemas/invitation.schema";
import { ObjectId } from "mongodb";
import { GET_DB } from "src/config/database";
import { boardModel } from "src/models/board.model";
import { userModel } from "src/models/user.model";

const INVITATION_COLLECTION_NAME = "invitations";

const INVALID_UPDATE_FIELDS = new Set(["_id", "inviterId", "inviteeId", "type", "createdAt"]);

const validateBeforeCreate = async (data: unknown) => {
  return await INVITATION_COLLECTION_SCHEMA.parseAsync(data);
};

const createNewBoardInvitation = async (data: InvitationCreateServiceType) => {
  const validData = await validateBeforeCreate(data);
  const newInvitationToAdd = {
    ...validData,
    inviterId: new ObjectId(validData.inviterId),
    inviteeId: new ObjectId(validData.inviteeId),
  };
  if (validData.boardInvitation) {
    newInvitationToAdd.boardInvitation = {
      ...validData.boardInvitation,
      boardId: new ObjectId(validData.boardInvitation.boardId) as unknown as string,
    };
  }
  const createdInvitation = await GET_DB().collection(INVITATION_COLLECTION_NAME).insertOne(newInvitationToAdd);
  return createdInvitation;
};

const findOneById = async (invitationId: string) => {
  const result = await GET_DB()
    .collection(INVITATION_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(invitationId) });
  return result;
};

const update = async (invitationId: string, updateData: InvitationUpdateType) => {
  for (const field of Object.keys(updateData)) {
    if (INVALID_UPDATE_FIELDS.has(field)) {
      delete updateData[field];
    }
  }

  if (updateData.boardInvitation) {
    updateData.boardInvitation = {
      ...updateData.boardInvitation,
      boardId: new ObjectId(updateData.boardInvitation.boardId) as unknown as string,
    };
  }

  const result = await GET_DB()
    .collection(INVITATION_COLLECTION_NAME)
    .findOneAndUpdate({ _id: new ObjectId(invitationId) }, { $set: updateData }, { returnDocument: "after" });
  return result;
};

const findByUser = async (userId: string) => {
  const queryConditions = [{ inviteeId: new ObjectId(userId) }, { _destroy: false }];

  const results = await GET_DB()
    .collection(INVITATION_COLLECTION_NAME)
    .aggregate([
      { $match: { $and: queryConditions } },
      {
        $lookup: {
          from: userModel.USER_COLLECTION_NAME,
          localField: "inviterId",
          foreignField: "_id",
          as: "inviter",
          pipeline: [{ $project: { password: 0, verifyToken: 0 } }],
        },
      },
      {
        $lookup: {
          from: userModel.USER_COLLECTION_NAME,
          localField: "inviteeId",
          foreignField: "_id",
          as: "invitee",
          pipeline: [{ $project: { password: 0, verifyToken: 0 } }],
        },
      },
      {
        $lookup: {
          from: boardModel.BOARD_COLLECTION_NAME,
          localField: "boardInvitation.boardId",
          foreignField: "_id",
          as: "board",
        },
      },
    ])
    .toArray();

  return results;
};

export const invitationModel = {
  INVITATION_COLLECTION_NAME,
  createNewBoardInvitation,
  findOneById,
  update,
  findByUser,
};
