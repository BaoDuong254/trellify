import { InvitationCreateType } from "@workspace/shared/schemas/invitation.schema";
import { BOARD_INVITATION_STATUS, INVITATION_TYPES } from "@workspace/shared/utils/constants";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
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
  const getInvitation = await invitationModel.findOneById(createdInvitation.insertedId.toString());

  const resultInvitation = {
    ...getInvitation,
    board,
    inviter: pickUser(inviter),
    invitee: pickUser(invitee),
  };
  return resultInvitation;
};

const getInvitations = async (userId: string) => {
  const getInvitations = await invitationModel.findByUser(userId);
  const resultInvitations = getInvitations.map((invite) => ({
    ...invite,
    inviter: invite.inviter[0] || {},
    invitee: invite.invitee[0] || {},
    board: invite.board[0] || {},
  }));

  return resultInvitations;
};

const updateBoardInvitation = async (invitationId: string, status: string, userId: string) => {
  const getInvitation = await invitationModel.findOneById(invitationId);
  if (!getInvitation) throw new ApiError(StatusCodes.NOT_FOUND, "Invitation not found!");

  const boardId = getInvitation.boardInvitation.boardId.toString() as string;
  const getBoard = await boardModel.findOneById(new ObjectId(boardId));
  if (!getBoard) throw new ApiError(StatusCodes.NOT_FOUND, "Board not found!");

  const boardOwnerAndMemberIds = [...getBoard.ownerIds, ...getBoard.memberIds].toString();
  if (status === BOARD_INVITATION_STATUS.ACCEPTED && boardOwnerAndMemberIds.includes(userId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "You are already a member of this board.");
  }

  const updateData = {
    boardInvitation: {
      ...getInvitation.boardInvitation,
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
