import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";

import { InvitationCreateType } from "@workspace/shared/schemas/invitation.schema";
import { BOARD_INVITATION_STATUS, INVITATION_TYPES } from "@workspace/shared/utils/constants";

import { boardModel } from "src/models/board.model";
import { invitationModel } from "src/models/invitation.model";
import { userModel } from "src/models/user.model";
import ApiError from "src/utils/api-error";
import { pickUser } from "src/utils/formatters";

const createNewBoardInvitation = async (requestBody: InvitationCreateType, inviterId: string) => {
  const inviter = await userModel.findOneById(inviterId);
  const invitee = await userModel.findOneByEmail(requestBody.inviteeEmail);
  const board = await boardModel.findOneById(new ObjectId(requestBody.boardId));

  if (!invitee || !inviter || !board) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Inviter, Invitee or Board not found!");
  }

  if (invitee._id.toString() === inviter._id.toString()) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "You cannot invite yourself to the board.");
  }

  const newInvitationData = {
    inviterId,
    inviteeId: invitee._id.toString(),
    type: INVITATION_TYPES.BOARD_INVITATION,
    boardInvitation: {
      boardId: board._id.toString(),
      status: BOARD_INVITATION_STATUS.PENDING,
    },
  };

  const createdInvitation = await invitationModel.createNewBoardInvitation(newInvitationData);
  const createdInvitationDetails = await invitationModel.findOneById(createdInvitation.insertedId.toString());

  const resultInvitation = {
    ...createdInvitationDetails,
    inviteeId: invitee._id.toString(),
    board,
    inviter: pickUser(inviter),
    invitee: pickUser(invitee),
  };
  return resultInvitation;
};

const getInvitations = async (userId: string) => {
  const invitations = await invitationModel.findByUser(userId);
  const resultInvitations = invitations.map((invite) => ({
    ...invite,
    inviter: invite.inviter[0] || {},
    invitee: invite.invitee[0] || {},
    board: invite.board[0] || {},
  }));

  return resultInvitations;
};

const updateBoardInvitation = async (invitationId: string, status: string, userId: string) => {
  const invitation = await invitationModel.findOneById(invitationId);
  if (!invitation || invitation._destroy) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Error.InvitationNotFound");
  }

  if (invitation.inviteeId.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Error.InvitationAccessDenied");
  }

  if (invitation.boardInvitation.status !== BOARD_INVITATION_STATUS.PENDING) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Error.InvitationAlreadyResolved");
  }

  const boardId = invitation.boardInvitation.boardId.toString() as string;
  const board = await boardModel.findOneById(new ObjectId(boardId));
  if (!board) throw new ApiError(StatusCodes.NOT_FOUND, "Error.BoardNotFound");

  const isAlreadyBoardMember = [...board.ownerIds, ...board.memberIds].some((id: ObjectId) => id.toString() === userId);
  if (isAlreadyBoardMember && status === BOARD_INVITATION_STATUS.ACCEPTED) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Error.AlreadyBoardMember");
  }

  const updateData = {
    boardInvitation: {
      ...invitation.boardInvitation,
      status: status,
    },
  };

  const updatedInvitation = await invitationModel.update(invitationId, updateData);

  if (updatedInvitation?.boardInvitation.status === BOARD_INVITATION_STATUS.ACCEPTED) {
    await boardModel.pushMemberIds(boardId, userId);
  }

  return updatedInvitation;
};

export const invitationService = {
  createNewBoardInvitation,
  getInvitations,
  updateBoardInvitation,
};
