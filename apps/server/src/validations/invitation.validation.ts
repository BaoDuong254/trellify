import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { INVITATION_CREATE_SCHEMA } from "@workspace/shared/schemas/invitation.schema";

import ApiError from "src/utils/api-error";

const createNewBoardInvitation = async (request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
  try {
    await INVITATION_CREATE_SCHEMA.parseAsync(request.body);
    next();
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error as string).message));
  }
};

export const invitationValidation = {
  createNewBoardInvitation,
};
