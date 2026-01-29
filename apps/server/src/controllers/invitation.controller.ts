import { StatusCodes } from "http-status-codes";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { invitationService } from "src/services/invitation.service";
import { InvitationCreateType } from "@workspace/shared/schemas/invitation.schema";

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
  } catch (error) {
    next(error);
  }
};

export const invitationController = {
  createNewBoardInvitation,
  getInvitations,
  updateBoardInvitation,
};
