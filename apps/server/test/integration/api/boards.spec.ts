import { ObjectId } from "mongodb";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { GET_DB } from "src/config/database";
import { cardModel } from "src/models/card.model";
import {
  addBoardMember,
  createActiveUser,
  createBoardVia,
  createCardVia,
  createColumnVia,
  getApp,
} from "test/integration/helpers";

describe("GET /api/v1/boards/:id", () => {
  it("returns the board with its cards grouped under their columns", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);

    const response = await request(getApp()).get(`/api/v1/boards/${boardId}`).set("Cookie", owner.cookie).expect(200);

    const board = response.body.data;
    expect(board.cards).toBeUndefined();
    expect(board.columns).toHaveLength(1);
    expect(board.columns[0]._id).toBe(columnId);
    expect(board.columns[0].cards.map((card: { _id: string }) => card._id)).toEqual([cardId]);
  });

  it("answers 404, not 403, to a user who is not on the board", async () => {
    const owner = await createActiveUser("owner");
    const outsider = await createActiveUser("outsider");
    const boardId = await createBoardVia(owner);

    await request(getApp()).get(`/api/v1/boards/${boardId}`).set("Cookie", outsider.cookie).expect(404);
  });

  it("lets a member read the board once they have been added", async () => {
    const owner = await createActiveUser("owner");
    const member = await createActiveUser("member");
    const boardId = await createBoardVia(owner);
    await addBoardMember(boardId, member.userId);

    await request(getApp()).get(`/api/v1/boards/${boardId}`).set("Cookie", member.cookie).expect(200);
  });

  it("rejects a malformed id with 422 instead of letting ObjectId throw a 500", async () => {
    const owner = await createActiveUser("owner");

    await request(getApp()).get("/api/v1/boards/not-an-object-id").set("Cookie", owner.cookie).expect(422);
  });

  it("answers 404 for a well-formed id that does not exist", async () => {
    const owner = await createActiveUser("owner");

    await request(getApp()).get(`/api/v1/boards/${new ObjectId().toString()}`).set("Cookie", owner.cookie).expect(404);
  });

  it("hides soft-deleted cards", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const keptCardId = await createCardVia(owner, boardId, columnId, "Kept card");
    const deletedCardId = await createCardVia(owner, boardId, columnId, "Deleted card");
    await GET_DB()
      .collection(cardModel.CARD_COLLECTION_NAME)
      .updateOne({ _id: new ObjectId(deletedCardId) }, { $set: { _destroy: true } });

    const response = await request(getApp()).get(`/api/v1/boards/${boardId}`).set("Cookie", owner.cookie).expect(200);

    const cardIds = response.body.data.columns[0].cards.map((card: { _id: string }) => card._id);
    expect(cardIds).toEqual([keptCardId]);
  });

  it("requires authentication", async () => {
    await request(getApp()).get(`/api/v1/boards/${new ObjectId().toString()}`).expect(401);
  });
});
