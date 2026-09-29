import request from "supertest";
import { describe, expect, it } from "vitest";

import {
  type TestUser,
  addBoardMember,
  createActiveUser,
  createBoardVia,
  createCardVia,
  createColumnVia,
  getApp,
} from "test/integration/helpers";

const addComment = (actor: TestUser, cardId: string, content: string) =>
  request(getApp())
    .put(`/api/v1/cards/${cardId}`)
    .set("Cookie", actor.cookie)
    .send({ commentToAdd: { userAvatar: null, userDisplayName: "owner", content } })
    .expect(200);

describe("board snapshot payload", () => {
  it("replaces card comments with a count and serves them from their own endpoint", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);
    await addComment(owner, cardId, "first");
    await addComment(owner, cardId, "second");

    const board = await request(getApp()).get(`/api/v1/boards/${boardId}`).set("Cookie", owner.cookie).expect(200);
    const card = board.body.data.columns[0].cards[0];
    expect(card.commentCount).toBe(2);
    expect(card).not.toHaveProperty("comments");

    const comments = await request(getApp())
      .get(`/api/v1/cards/${cardId}/comments`)
      .set("Cookie", owner.cookie)
      .expect(200);
    expect(comments.body.data.map((comment: { content: string }) => comment.content)).toEqual(["second", "first"]);
  });

  it("keeps a card's comments away from users outside the board", async () => {
    const owner = await createActiveUser("owner");
    const outsider = await createActiveUser("outsider");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);

    const response = await request(getApp())
      .get(`/api/v1/cards/${cardId}/comments`)
      .set("Cookie", outsider.cookie)
      .expect(403);
    expect(response.body.message).toBe("Error.BoardAccessDenied");
  });

  it("moves the card's updatedAt forward on comment and member changes", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);

    const commented = await addComment(owner, cardId, "hello");
    expect(commented.body.data.updatedAt).toBeTruthy();

    const joined = await request(getApp())
      .put(`/api/v1/cards/${cardId}`)
      .set("Cookie", owner.cookie)
      .send({ incomingMemberInfo: { userId: owner.userId, action: "ADD" } })
      .expect(200);
    const joinedAt = new Date(String(joined.body.data.updatedAt)).getTime();
    const commentedAt = new Date(String(commented.body.data.updatedAt)).getTime();
    expect(joinedAt).toBeGreaterThanOrEqual(commentedAt);
  });

  it("exposes only public profile fields of owners and members", async () => {
    const owner = await createActiveUser("owner");
    const member = await createActiveUser("member");
    const boardId = await createBoardVia(owner);
    await addBoardMember(boardId, member.userId);
    await request(getApp())
      .put(`/api/v1/boards/${boardId}/star`)
      .set("Cookie", member.cookie)
      .send({ starred: true })
      .expect(200);

    const board = await request(getApp()).get(`/api/v1/boards/${boardId}`).set("Cookie", owner.cookie).expect(200);
    const publicFields = new Set([
      "_id",
      "avatar",
      "createdAt",
      "displayName",
      "email",
      "isActive",
      "role",
      "updatedAt",
      "username",
    ]);
    const users: Record<string, unknown>[] = [...board.body.data.owners, ...board.body.data.members];
    expect(users).toHaveLength(2);
    for (const user of users) {
      expect(new Set(Object.keys(user))).toEqual(publicFields);
    }
  });
});
