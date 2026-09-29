import { Document, ObjectId, UpdateFilter } from "mongodb";

import {
  USER_COLLECTION_SCHEMA,
  UserPatchType,
  UserRegistrationServiceType,
} from "@workspace/shared/schemas/user.schema";

import { GET_DB } from "src/config/database";

const USER_COLLECTION_NAME = "users";

const PUBLIC_USER_PROJECTION = {
  email: 1,
  username: 1,
  displayName: 1,
  avatar: 1,
  role: 1,
  isActive: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

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

const setStarredBoard = async (userId: string, boardId: string, isStarred: boolean) => {
  const change = { starredBoardIds: new ObjectId(boardId) };
  return await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(userId) },
      (isStarred ? { $addToSet: change } : { $pull: change }) as UpdateFilter<Document>
    );
};

const findStarredBoardIds = async (userId: string): Promise<ObjectId[]> => {
  const user = await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(userId) }, { projection: { starredBoardIds: 1 } });
  return user?.starredBoardIds ?? [];
};

const findOneByEmail = async (emailValue: string) => {
  const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ email: emailValue, _destroy: false });
  return result;
};

const findOneByVerifyToken = async (hashedToken: string) => {
  return await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .findOne({
      verifyToken: hashedToken,
      verifyTokenExpiry: { $gt: new Date() },
    });
};

const hardDeleteById = async (userId: string): Promise<void> => {
  await GET_DB()
    .collection(USER_COLLECTION_NAME)
    .deleteOne({ _id: new ObjectId(userId) });
};

const update = async (userId: string, updateData: UserPatchType) => {
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
  PUBLIC_USER_PROJECTION,
  createNew,
  findOneById,
  setStarredBoard,
  findStarredBoardIds,
  findOneByEmail,
  findOneByVerifyToken,
  hardDeleteById,
  update,
};
