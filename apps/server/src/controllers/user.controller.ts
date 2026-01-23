import { StatusCodes } from "http-status-codes";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { userService } from "src/services/user.service";
import { UserRegistrationType } from "@workspace/shared/schemas/user.schema";

const createNew = async (request: ExpressRequest, response: ExpressResponse, next: NextFunction) => {
  try {
    const createdUser = await userService.createNew(request.body as UserRegistrationType);
    response.status(StatusCodes.CREATED).json({
      statusCode: StatusCodes.CREATED,
      message: "User created successfully",
      data: createdUser,
    });
  } catch (error) {
    next(error);
  }
};

export const userController = {
  createNew,
};
