import { UserRegistrationType } from "@workspace/shared/schemas/user.schema";
import { StatusCodes } from "http-status-codes";
import { userModel } from "src/models/user.model";
import ApiError from "src/utils/api-error";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { pickUser } from "src/utils/formatters";
import environmentConfig from "src/config/environment";
import { BrevoProvider } from "src/providers/brevo.provider";

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
  const verificationLink = `${environmentConfig.CLIENT_URL}/account/verification?email=${getNewlyCreatedUser?.email}&token=${getNewlyCreatedUser?.verifyToken}`;
  const subject = "Trellify - Verify your email address";
  const htmlContent = `
    <h1>Trellify - Email Verification</h1>
    <p>Thank you for registering with Trellify! Please verify your email address by clicking the link below:</p>
    <a href="${verificationLink}">Verify Email Address</a>
    <p>If you did not create an account, please ignore this email.</p>
    <p>Best regards,<br/>The Trellify Team</p>
  `;
  await BrevoProvider.sendEmail(getNewlyCreatedUser!.email as string, subject, htmlContent);
  return pickUser(getNewlyCreatedUser);
};

export const userService = {
  createNew,
};
