import bcryptjs from "bcryptjs";
import type { Express } from "express";
import { ObjectId } from "mongodb";
import request from "supertest";

import { BOARD_TYPES } from "@workspace/shared/utils/constants";

import { createApp } from "src/app";
import environmentConfig from "src/config/environment";
import { boardModel } from "src/models/board.model";
import { userModel } from "src/models/user.model";
import { JwtProvider } from "src/providers/jwt.provider";
import { boardService } from "src/services/board.service";

export const TEST_PASSWORD = "Password123";

const TOKEN_LIFE_SECONDS = 60 * 60;

let app: Express | undefined;

export const getApp = (): Express => {
  app ??= createApp();
  return app;
};

export type TestUser = {
  userId: string;
  email: string;
  cookie: string;
};

export const createActiveUser = async (name: string): Promise<TestUser> => {
  const email = `${name}@trellify.test`;
  const created = await userModel.createNew({
    email,
    password: bcryptjs.hashSync(TEST_PASSWORD, 4),
    username: name,
    displayName: name,
    verifyToken: null,
  });
  const userId = created.insertedId.toString();
  await userModel.update(userId, { isActive: true });

  const accessToken = await JwtProvider.generateToken(
    { _id: new ObjectId(userId), email },
    environmentConfig.ACCESS_TOKEN_SECRET_SIGNATURE,
    TOKEN_LIFE_SECONDS
  );

  return { userId, email, cookie: `accessToken=${accessToken}` };
};

export const createBoardVia = async (owner: TestUser, title = "Test board"): Promise<string> => {
  const response = await request(getApp())
    .post("/api/v1/boards")
    .set("Cookie", owner.cookie)
    .send({ title, description: "A board created by an integration test", type: BOARD_TYPES.PRIVATE })
    .expect(201);

  return String(response.body.data._id);
};

export const createColumnVia = async (actor: TestUser, boardId: string, title = "To do"): Promise<string> => {
  const response = await request(getApp())
    .post("/api/v1/columns")
    .set("Cookie", actor.cookie)
    .send({ boardId, title })
    .expect(201);

  return String(response.body.data._id);
};

export const createCardVia = async (
  actor: TestUser,
  boardId: string,
  columnId: string,
  title = "Write tests"
): Promise<string> => {
  const response = await request(getApp())
    .post("/api/v1/cards")
    .set("Cookie", actor.cookie)
    .send({ boardId, columnId, title })
    .expect(201);

  return String(response.body.data._id);
};

export const addBoardMember = async (boardId: string, userId: string): Promise<void> => {
  await boardModel.pushMemberIds(boardId, userId);
  await boardService.invalidateBoardMembership(boardId);
};
