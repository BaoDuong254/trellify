import { ObjectId } from "mongodb";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { GET_DB } from "src/config/database";
import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { userModel } from "src/models/user.model";
import {
  addBoardMember,
  createActiveUser,
  createBoardVia,
  createCardVia,
  createColumnVia,
  getApp,
} from "test/integration/helpers";

const findById = (collection: string, id: string) =>
  GET_DB()
    .collection(collection)
    .findOne({ _id: new ObjectId(id) });

const idStrings = (ids: unknown): string[] => (ids as ObjectId[]).map(String);

describe("PUT /api/v1/boards/:id", () => {
  it("does not let a member rewrite ownership, membership or the soft-delete flag", async () => {
    const owner = await createActiveUser("owner");
    const member = await createActiveUser("member");
    const outsider = await createActiveUser("outsider");
    const boardId = await createBoardVia(owner);
    await addBoardMember(boardId, member.userId);

    await request(getApp())
      .put(`/api/v1/boards/${boardId}`)
      .set("Cookie", member.cookie)
      .send({
        title: "Renamed",
        ownerIds: [member.userId],
        memberIds: [outsider.userId],
        _destroy: true,
      })
      .expect(200);

    const board = await findById(boardModel.BOARD_COLLECTION_NAME, boardId);
    expect(board?.title).toBe("Renamed");
    expect(idStrings(board?.ownerIds)).toEqual([owner.userId]);
    expect(idStrings(board?.memberIds)).toEqual([member.userId]);
    expect(board?._destroy).toBe(false);
  });

  it("keeps columnOrderIds when only the title changes", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);

    await request(getApp())
      .put(`/api/v1/boards/${boardId}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Renamed" })
      .expect(200);

    const board = await findById(boardModel.BOARD_COLLECTION_NAME, boardId);
    expect(idStrings(board?.columnOrderIds)).toEqual([columnId]);
  });
});

describe("PUT /api/v1/columns/:id", () => {
  it("ignores fields outside title and cardOrderIds", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);

    await request(getApp())
      .put(`/api/v1/columns/${columnId}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Doing", _destroy: true })
      .expect(200);

    const column = await findById(columnModel.COLUMN_COLLECTION_NAME, columnId);
    expect(column?.title).toBe("Doing");
    expect(column?._destroy).toBe(false);
  });

  it("keeps cardOrderIds when only the title changes", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);

    await request(getApp())
      .put(`/api/v1/columns/${columnId}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Doing" })
      .expect(200);

    const column = await findById(columnModel.COLUMN_COLLECTION_NAME, columnId);
    expect(idStrings(column?.cardOrderIds)).toEqual([cardId]);
  });
});

describe("PUT /api/v1/cards/:id", () => {
  it("ignores memberIds, columnId and the soft-delete flag", async () => {
    const owner = await createActiveUser("owner");
    const outsider = await createActiveUser("outsider");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const otherColumnId = await createColumnVia(owner, boardId, "Done");
    const cardId = await createCardVia(owner, boardId, columnId);

    await request(getApp())
      .put(`/api/v1/cards/${cardId}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Renamed card", memberIds: [outsider.userId], columnId: otherColumnId, _destroy: true })
      .expect(200);

    const card = await findById(cardModel.CARD_COLLECTION_NAME, cardId);
    expect(card?.title).toBe("Renamed card");
    expect(card?.memberIds).toEqual([]);
    expect(String(card?.columnId)).toBe(columnId);
    expect(card?._destroy).toBe(false);
  });

  it("keeps comments and members when only the title changes", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);
    await request(getApp())
      .put(`/api/v1/cards/${cardId}`)
      .set("Cookie", owner.cookie)
      .send({ commentToAdd: { userAvatar: null, userDisplayName: "owner", content: "First!" } })
      .expect(200);
    await request(getApp())
      .put(`/api/v1/cards/${cardId}`)
      .set("Cookie", owner.cookie)
      .send({ incomingMemberInfo: { userId: owner.userId, action: "ADD" } })
      .expect(200);

    await request(getApp())
      .put(`/api/v1/cards/${cardId}`)
      .set("Cookie", owner.cookie)
      .send({ title: "Renamed card" })
      .expect(200);

    const card = await findById(cardModel.CARD_COLLECTION_NAME, cardId);
    expect(card?.comments).toHaveLength(1);
    expect(idStrings(card?.memberIds)).toEqual([owner.userId]);
  });
});

describe("PUT /api/v1/users/update", () => {
  it("only lets a user change their display name through the plain update branch", async () => {
    const user = await createActiveUser("someone");
    const before = await userModel.findOneById(user.userId);

    await request(getApp())
      .put("/api/v1/users/update")
      .set("Cookie", user.cookie)
      .send({ displayName: "New Name", role: "admin", isActive: false, password: "Plaintext123", verifyToken: "x" })
      .expect(200);

    const after = await userModel.findOneById(user.userId);
    expect(after?.displayName).toBe("New Name");
    expect(after?.role).toBe("client");
    expect(after?.isActive).toBe(true);
    expect(after?.password).toBe(before?.password);
    expect(after?.verifyToken).toBeNull();
  });

  it("never stores a lone current_password on the user document", async () => {
    const user = await createActiveUser("someone");

    await request(getApp())
      .put("/api/v1/users/update")
      .set("Cookie", user.cookie)
      .send({ current_password: "Password123" })
      .expect(200);

    const after = await userModel.findOneById(user.userId);
    expect(after).not.toHaveProperty("current_password");
  });
});
