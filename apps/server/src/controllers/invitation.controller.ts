import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { InvitationCreateType } from "@workspace/shared/schemas/invitation.schema";
import { BOARD_INVITATION_STATUS } from "@workspace/shared/utils/constants";
import { BOARD_UPDATE_REASONS } from "@workspace/shared/utils/socket-events";

import { invitationService } from "src/services/invitation.service";
import { broadcastBoardUpdate, notifyUserInvitedToBoard } from "src/sockets/board/board.broadcast";

const createNewBoardInvitation = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const inviterId =
      typeof request?.jwtDecoded === "object" ? (request.jwtDecoded._id.toString() as string) : undefined;
    const resultInvitation = await invitationService.createNewBoardInvitation(
      request.body as InvitationCreateType,
      inviterId!
    );
    response.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "Invitation created successfully",
      data: resultInvitation,
    });
    notifyUserInvitedToBoard(resultInvitation);
  } catch (error) {
    next(error);
  }
};

const getInvitations = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const userId = typeof request?.jwtDecoded === "object" ? (request.jwtDecoded._id.toString() as string) : undefined;
    const resultInvitations = await invitationService.getInvitations(userId!);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Get invitations successfully",
      data: resultInvitations,
    });
  } catch (error) {
    next(error);
  }
};

const updateBoardInvitation = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const userId = typeof request?.jwtDecoded === "object" ? (request.jwtDecoded._id.toString() as string) : undefined;
    const { invitationId } = request.params;
    const { status } = request.body as { status: string };
    const updatedInvitation = await invitationService.updateBoardInvitation(invitationId as string, status, userId!);
    response.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      message: "Invitation updated successfully",
      data: updatedInvitation,
    });
    if (updatedInvitation?.boardInvitation?.status === BOARD_INVITATION_STATUS.ACCEPTED) {
      broadcastBoardUpdate(request, updatedInvitation.boardInvitation.boardId, BOARD_UPDATE_REASONS.MEMBER_JOINED);
    }
  } catch (error) {
    next(error);
  }
};

export const invitationController = {
  createNewBoardInvitation,
  getInvitations,
  updateBoardInvitation,
};
