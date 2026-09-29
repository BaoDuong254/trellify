import { ObjectId } from "mongodb";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { GET_DB } from "src/config/database";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { emailQueue } from "src/queues/email/email.queue";
import {
  type TestUser,
  createActiveUser,
  createBoardVia,
  createCardVia,
  createColumnVia,
  getApp,
} from "test/integration/helpers";

const put = (actor: TestUser, path: string, body: object) =>
  request(getApp()).put(path).set("Cookie", actor.cookie).send(body);

const findById = (collection: string, id: string) =>
  GET_DB()
    .collection(collection)
    .findOne({ _id: new ObjectId(id) });

describe("card placement rules", () => {
  it("refuses a card aimed at another board's column", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const otherBoardId = await createBoardVia(owner, "Other board");
    const foreignColumnId = await createColumnVia(owner, otherBoardId);

    const response = await request(getApp())
      .post("/api/v1/cards")
      .set("Cookie", owner.cookie)
      .send({ boardId, columnId: foreignColumnId, title: "Sneaky card" })
      .expect(404);

    expect(response.body.message).toBe("Error.ColumnNotFound");
    const foreignColumn = await findById(columnModel.COLUMN_COLLECTION_NAME, foreignColumnId);
    expect(foreignColumn?.cardOrderIds).toEqual([]);
  });

  it("refuses to create a card in, or move a card into, an archived column", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const todo = await createColumnVia(owner, boardId, "To do");
    const archived = await createColumnVia(owner, boardId, "Archived");
    const cardId = await createCardVia(owner, boardId, todo);
    await put(owner, `/api/v1/columns/${archived}`, { archived: true }).expect(200);

    await request(getApp())
      .post("/api/v1/cards")
      .set("Cookie", owner.cookie)
      .send({ boardId, columnId: archived, title: "Hidden card" })
      .expect(409);

    const moved = await put(owner, "/api/v1/boards/supports/moving_card", {
      currentCardId: cardId,
      prevColumnId: todo,
      prevCardOrderIds: [],
      nextColumnId: archived,
      nextCardOrderIds: [cardId],
    }).expect(409);
    expect(moved.body.message).toBe("Error.ColumnUnavailable");
  });

  it("deletes an archived card together with its column, so it can never be restored as an orphan", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);
    await put(owner, `/api/v1/cards/${cardId}`, { archived: true }).expect(200);
    await request(getApp()).delete(`/api/v1/columns/${columnId}`).set("Cookie", owner.cookie).expect(200);

    await put(owner, `/api/v1/cards/${cardId}`, { archived: false }).expect(404);

    const card = await findById(cardModel.CARD_COLLECTION_NAME, cardId);
    expect(card?._destroy).toBe(true);
    const archived = await request(getApp())
      .get(`/api/v1/boards/${boardId}/archived`)
      .set("Cookie", owner.cookie)
      .expect(200);
    expect(archived.body.data.cards).toEqual([]);
  });
});

describe("board deletion", () => {
  it("soft-deletes the board's columns and cards with it", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);

    await request(getApp()).delete(`/api/v1/boards/${boardId}`).set("Cookie", owner.cookie).expect(200);

    const column = await findById(columnModel.COLUMN_COLLECTION_NAME, columnId);
    const card = await findById(cardModel.CARD_COLLECTION_NAME, cardId);
    expect(column?._destroy).toBe(true);
    expect(card?._destroy).toBe(true);
  });
});

describe("legacy comments", () => {
  it("gives comments written before comment ids existed an id so they can be edited", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);
    await GET_DB()
      .collection(cardModel.CARD_COLLECTION_NAME)
      .updateOne(
        { _id: new ObjectId(cardId) },
        {
          $set: {
            comments: [
              {
                userId: owner.userId,
                userEmail: owner.email,
                userAvatar: null,
                userDisplayName: "owner",
                content: "Old comment",
                commentedAt: new Date(),
              },
            ],
          },
        }
      );

    const comments = await request(getApp())
      .get(`/api/v1/cards/${cardId}/comments`)
      .set("Cookie", owner.cookie)
      .expect(200);
    const commentId: string = comments.body.data[0]._id;
    expect(commentId).toBeTruthy();

    const edited = await put(owner, `/api/v1/cards/${cardId}`, {
      commentToUpdate: { _id: commentId, content: "Edited old comment" },
    }).expect(200);
    expect(edited.body.data.comments[0].content).toBe("Edited old comment");
  });
});

describe("card side effects", () => {
  it("records no activity when labels are saved unchanged", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);

    await put(owner, `/api/v1/cards/${cardId}`, { labelIds: [] }).expect(200);

    const activities = await request(getApp())
      .get(`/api/v1/cards/${cardId}/activities`)
      .set("Cookie", owner.cookie)
      .expect(200);
    expect(activities.body.data.map((activity: { type: string }) => activity.type)).toEqual(["CARD_CREATED"]);
  });

  it("schedules the reminder again when a completed due date is reopened", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await put(owner, `/api/v1/cards/${cardId}`, { dueDate: dueDate.toISOString() }).expect(200);
    await put(owner, `/api/v1/cards/${cardId}`, { dueComplete: true }).expect(200);
    await emailQueue.obliterate({ force: true });

    await put(owner, `/api/v1/cards/${cardId}`, { dueComplete: false }).expect(200);

    const jobs = await emailQueue.getJobs(["delayed"]);
    expect(jobs.map((job) => job.data)).toEqual([{ kind: "due-reminder", cardId, dueTs: dueDate.getTime() }]);
  });

  it("does not reschedule the reminder when the due date is cleared or was never completed", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await put(owner, `/api/v1/cards/${cardId}`, { dueDate: dueDate.toISOString() }).expect(200);
    await emailQueue.obliterate({ force: true });

    await put(owner, `/api/v1/cards/${cardId}`, { dueComplete: false }).expect(200);
    await put(owner, `/api/v1/cards/${cardId}`, { dueDate: null, dueComplete: false }).expect(200);

    expect(await emailQueue.getJobs(["delayed"])).toEqual([]);
  });
});
