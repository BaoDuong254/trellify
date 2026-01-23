import { UserRegistrationType } from "@workspace/shared/schemas/user.schema";
import { StatusCodes } from "http-status-codes";
import { userModel } from "src/models/user.model";
import ApiError from "src/utils/api-error";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { pickUser } from "src/utils/formatters";

const createNew = async (requestBody: UserRegistrationType) => {
  const existUser = await userModel.findOneByEmail(requestBody.email);
  if (existUser) {
    throw new ApiError(StatusCodes.CONFLICT, "User with this email already exists");
  }
  const nameFromEmail = requestBody.email.split("@")[0];
  const newUserData = {
    email: requestBody.email,
    password: bcryptjs.hashSync(requestBody.password, 10),
    username: nameFromEmail!,
    displayName: nameFromEmail!,
    verifyToken: uuidv4(),
  };
  const createdUser = await userModel.createNew(newUserData);
  const getNewlyCreatedUser = await userModel.findOneById(createdUser.insertedId.toString());
  return pickUser(getNewlyCreatedUser);
};

export const userService = {
  createNew,
};
