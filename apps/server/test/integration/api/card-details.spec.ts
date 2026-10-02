import { ObjectId } from "mongodb";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { CARD_ACTIVITY_TYPES } from "@workspace/shared/schemas/activity.schema";

import { GET_DB } from "src/config/database";
import { cardModel } from "src/models/card.model";
import {
  type TestUser,
  addBoardMember,
  createActiveUser,
  createBoardVia,
  createCardVia,
  createColumnVia,
  getApp,
} from "test/integration/helpers";

const setUpCard = async (): Promise<{ owner: TestUser; boardId: string; cardId: string }> => {
  const owner = await createActiveUser("owner");
  const boardId = await createBoardVia(owner);
  const columnId = await createColumnVia(owner, boardId);
  const cardId = await createCardVia(owner, boardId, columnId);
  return { owner, boardId, cardId };
};

const putCard = (actor: TestUser, cardId: string, body: object) =>
  request(getApp()).put(`/api/v1/cards/${cardId}`).set("Cookie", actor.cookie).send(body);

describe("PUT /api/v1/cards/:id details", () => {
  it("stores due date, labels and checklist", async () => {
    const { owner, cardId } = await setUpCard();
    const dueDate = "2030-01-02T03:04:00.000Z";

    const response = await putCard(owner, cardId, {
      dueDate,
      dueComplete: true,
      labelIds: ["l1"],
      checklist: [{ _id: "c1", text: "First", done: false }],
    }).expect(200);

    expect(response.body.data.dueDate).toBe(dueDate);
    expect(response.body.data.dueComplete).toBe(true);
    expect(response.body.data.labelIds).toEqual(["l1"]);
    expect(response.body.data.checklist).toEqual([{ _id: "c1", text: "First", done: false }]);

    const cleared = await putCard(owner, cardId, { dueDate: null }).expect(200);
    expect(cleared.body.data.dueDate).toBeNull();
    expect(cleared.body.data.checklist).toHaveLength(1);
  });

  it("rejects a malformed due date", async () => {
    const { owner, cardId } = await setUpCard();
    const response = await putCard(owner, cardId, { dueDate: "tomorrow" }).expect(422);
    expect(response.body.statusCode).toBe(422);
  });

  it("removes the cover but never accepts a cover URL", async () => {
    const { owner, cardId } = await setUpCard();
    await GET_DB()
      .collection(cardModel.CARD_COLLECTION_NAME)
      .updateOne({ _id: new ObjectId(cardId) }, { $set: { cover: "https://example.com/cover.png" } });

    await putCard(owner, cardId, { cover: "https://evil.example/x.png" }).expect(422);

    const removed = await putCard(owner, cardId, { cover: null }).expect(200);
    expect(removed.body.data.cover).toBeNull();

    const activities = await request(getApp())
      .get(`/api/v1/cards/${cardId}/activities`)
      .set("Cookie", owner.cookie)
      .expect(200);
    expect(activities.body.data[0].type).toBe(CARD_ACTIVITY_TYPES.COVER_REMOVED);
  });

  it("lets only the author edit or delete a comment", async () => {
    const { owner, boardId, cardId } = await setUpCard();
    const member = await createActiveUser("member");
    await addBoardMember(boardId, member.userId);

    const added = await putCard(owner, cardId, {
      commentToAdd: { content: "hello" },
    }).expect(200);
    const commentId = added.body.data.comments[0]._id as string;
    expect(commentId).toBeTruthy();

    await putCard(member, cardId, { commentToUpdate: { _id: commentId, content: "hijack" } }).expect(404);
    await putCard(member, cardId, { commentToDelete: { _id: commentId } }).expect(404);

    const edited = await putCard(owner, cardId, { commentToUpdate: { _id: commentId, content: "edited" } }).expect(200);
    expect(edited.body.data.comments[0].content).toBe("edited");
    expect(edited.body.data.comments[0].editedAt).toBeTruthy();

    const deleted = await putCard(owner, cardId, { commentToDelete: { _id: commentId } }).expect(200);
    expect(deleted.body.data.comments).toEqual([]);
  });
});

describe("PUT /api/v1/boards/:id labels", () => {
  it("replaces the board label set and rejects an invalid colour", async () => {
    const { owner, boardId } = await setUpCard();
    const labels = [{ _id: "l1", name: "Bug", color: "#e74c3c" }];

    await request(getApp()).put(`/api/v1/boards/${boardId}`).set("Cookie", owner.cookie).send({ labels }).expect(200);

    const board = await request(getApp()).get(`/api/v1/boards/${boardId}`).set("Cookie", owner.cookie).expect(200);
    expect(board.body.data.labels).toEqual(labels);

    await request(getApp())
      .put(`/api/v1/boards/${boardId}`)
      .set("Cookie", owner.cookie)
      .send({ labels: [{ _id: "l2", name: "x", color: "red" }] })
      .expect(422);
  });
});

describe("DELETE /api/v1/boards/:id", () => {
  it("is owner only and hides the board afterwards", async () => {
    const { owner, boardId } = await setUpCard();
    const member = await createActiveUser("member");
    await addBoardMember(boardId, member.userId);

    await request(getApp()).delete(`/api/v1/boards/${boardId}`).set("Cookie", member.cookie).expect(403);

    await request(getApp()).get(`/api/v1/boards/${boardId}`).set("Cookie", owner.cookie).expect(200);
    await request(getApp()).delete(`/api/v1/boards/${boardId}`).set("Cookie", owner.cookie).expect(200);

    await request(getApp()).get(`/api/v1/boards/${boardId}`).set("Cookie", owner.cookie).expect(404);
    const list = await request(getApp()).get("/api/v1/boards").set("Cookie", owner.cookie).expect(200);
    expect(list.body.data.boards).toEqual([]);
  });
});
