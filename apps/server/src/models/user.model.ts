import {
  USER_COLLECTION_SCHEMA,
  UserRegistrationServiceType,
  UserUpdateType,
} from "@workspace/shared/schemas/user.schema";
import { ObjectId } from "mongodb";
import { GET_DB } from "src/config/database";

const USER_COLLECTION_NAME = "users";

const INVALID_UPDATE_FIELDS = new Set(["_id", "email", "username", "createdAt"]);

const validateBeforeCreate = async (data: unknown) => {
  return await USER_COLLECTION_SCHEMA.parseAsync(data);
};

const createNew = async (data: UserRegistrationServiceType) => {
  const validData = await validateBeforeCreate(data);
  const createdUser = await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validData);
  return createdUser;
};

const findOneById = async (userId: string) => {
  const result = await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(userId) });
  return result;
};

const findOneByEmail = async (emailValue: string) => {
  const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ email: emailValue });
  return result;
};

const update = async (userId: string, updateData: UserUpdateType) => {
  for (const field of Object.keys(updateData)) {
    if (INVALID_UPDATE_FIELDS.has(field)) {
      delete updateData[field];
    }
  }

  const result = await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .findOneAndUpdate({ _id: new ObjectId(userId) }, { $set: updateData }, { returnDocument: "after" });
  return result;
};

export const userModel = {
  USER_COLLECTION_NAME,
  createNew,
  findOneById,
  findOneByEmail,
  update,
};
