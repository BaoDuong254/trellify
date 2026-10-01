import request from "supertest";
import { describe, expect, it } from "vitest";

import {
  type TestUser,
  createActiveUser,
  createBoardVia,
  createCardVia,
  createColumnVia,
  getApp,
} from "test/integration/helpers";

const getBoard = async (actor: TestUser, boardId: string) => {
  const response = await request(getApp()).get(`/api/v1/boards/${boardId}`).set("Cookie", actor.cookie).expect(200);
  return response.body.data;
};

const getArchived = async (actor: TestUser, boardId: string) => {
  const response = await request(getApp())
    .get(`/api/v1/boards/${boardId}/archived`)
    .set("Cookie", actor.cookie)
    .expect(200);
  return response.body.data;
};

const put = (actor: TestUser, path: string, body: object) =>
  request(getApp()).put(path).set("Cookie", actor.cookie).send(body);

const setUpColumnWithCards = async (titles: string[]) => {
  const owner = await createActiveUser("owner");
  const boardId = await createBoardVia(owner);
  const columnId = await createColumnVia(owner, boardId);
  const cardIds: string[] = [];
  for (const title of titles) cardIds.push(await createCardVia(owner, boardId, columnId, title));
  return { owner, boardId, columnId, cardIds };
};

const cardOrder = async (actor: TestUser, boardId: string): Promise<string[]> => {
  const board = await getBoard(actor, boardId);
  return board.columns[0].cardOrderIds;
};

describe("archiving cards", () => {
  it("hides an archived card and restores it between its old neighbours", async () => {
    const { owner, boardId, columnId, cardIds } = await setUpColumnWithCards(["Card A", "Card B", "Card C"]);
    const [a, b, c] = cardIds;

    await put(owner, `/api/v1/cards/${b}`, { archived: true }).expect(200);

    const board = await getBoard(owner, boardId);
    expect(board.columns[0].cards.map((card: { _id: string }) => card._id)).toEqual([a, c]);
    const archived = await getArchived(owner, boardId);
    expect(archived.cards.map((card: { _id: string }) => card._id)).toEqual([b]);

    const d = await createCardVia(owner, boardId, columnId, "Card D");
    await put(owner, `/api/v1/cards/${b}`, { archived: false }).expect(200);

    expect(await cardOrder(owner, boardId)).toEqual([a, b, c, d]);
    const archivedAfterRestore = await getArchived(owner, boardId);
    expect(archivedAfterRestore.cards).toEqual([]);
  });

  it("rejects edits to an archived card but still lets it be restored", async () => {
    const { owner, cardIds } = await setUpColumnWithCards(["Card A"]);
    const [a] = cardIds;

    await put(owner, `/api/v1/cards/${a}`, { archived: true }).expect(200);

    const renamed = await put(owner, `/api/v1/cards/${a}`, { title: "Renamed" }).expect(409);
    expect(renamed.body.message).toBe("Error.CardUnavailable");
    await put(owner, `/api/v1/cards/${a}`, {
      commentToAdd: { content: "late" },
    }).expect(409);

    await put(owner, `/api/v1/cards/${a}`, { archived: false }).expect(200);
    await put(owner, `/api/v1/cards/${a}`, { title: "Renamed" }).expect(200);
  });

  it("follows the previous neighbour when the column was reordered", async () => {
    const { owner, boardId, columnId, cardIds } = await setUpColumnWithCards(["Card A", "Card B", "Card C"]);
    const [a, b, c] = cardIds;

    await put(owner, `/api/v1/cards/${b}`, { archived: true }).expect(200);
    await put(owner, `/api/v1/columns/${columnId}`, { cardOrderIds: [c, a] }).expect(200);
    await put(owner, `/api/v1/cards/${b}`, { archived: false }).expect(200);

    expect(await cardOrder(owner, boardId)).toEqual([c, a, b]);
  });

  it("falls back to the next neighbour when the previous one was deleted", async () => {
    const { owner, boardId, cardIds } = await setUpColumnWithCards(["Card A", "Card B", "Card C"]);
    const [a, b, c] = cardIds;

    await put(owner, `/api/v1/cards/${b}`, { archived: true }).expect(200);
    await request(getApp()).delete(`/api/v1/cards/${a}`).set("Cookie", owner.cookie).expect(200);
    await put(owner, `/api/v1/cards/${b}`, { archived: false }).expect(200);

    expect(await cardOrder(owner, boardId)).toEqual([b, c]);
  });

  it("never duplicates a card restored twice at the same time", async () => {
    const { owner, boardId, cardIds } = await setUpColumnWithCards(["Card A", "Card B"]);
    const [a, b] = cardIds;

    await put(owner, `/api/v1/cards/${a}`, { archived: true }).expect(200);
    await Promise.all([
      put(owner, `/api/v1/cards/${a}`, { archived: false }),
      put(owner, `/api/v1/cards/${a}`, { archived: false }),
    ]);

    expect(await cardOrder(owner, boardId)).toEqual([a, b]);
  });

  it("refuses to restore a card whose column is archived", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const columnId = await createColumnVia(owner, boardId);
    const cardId = await createCardVia(owner, boardId, columnId);

    await put(owner, `/api/v1/cards/${cardId}`, { archived: true }).expect(200);
    await put(owner, `/api/v1/columns/${columnId}`, { archived: true }).expect(200);

    const response = await put(owner, `/api/v1/cards/${cardId}`, { archived: false }).expect(409);
    expect(response.body.message).toBe("Error.ColumnUnavailable");
  });

  it("does not show archived items to a user outside the board", async () => {
    const owner = await createActiveUser("owner");
    const outsider = await createActiveUser("outsider");
    const boardId = await createBoardVia(owner);

    await request(getApp()).get(`/api/v1/boards/${boardId}/archived`).set("Cookie", outsider.cookie).expect(403);
  });
});

describe("archiving columns", () => {
  it("rejects edits to an archived column and to the cards inside it until it is restored", async () => {
    const { owner, columnId, cardIds } = await setUpColumnWithCards(["Card A"]);
    const [a] = cardIds;

    await put(owner, `/api/v1/columns/${columnId}`, { archived: true }).expect(200);

    const renamedColumn = await put(owner, `/api/v1/columns/${columnId}`, { title: "Renamed" }).expect(409);
    expect(renamedColumn.body.message).toBe("Error.ColumnUnavailable");
    const renamedCard = await put(owner, `/api/v1/cards/${a}`, { title: "Renamed" }).expect(409);
    expect(renamedCard.body.message).toBe("Error.CardUnavailable");

    await put(owner, `/api/v1/columns/${columnId}`, { archived: false }).expect(200);
    await put(owner, `/api/v1/columns/${columnId}`, { title: "Renamed" }).expect(200);
    await put(owner, `/api/v1/cards/${a}`, { title: "Renamed" }).expect(200);
  });

  it("removes the column and its cards from the board until it is restored in place", async () => {
    const owner = await createActiveUser("owner");
    const boardId = await createBoardVia(owner);
    const todo = await createColumnVia(owner, boardId, "To do");
    const done = await createColumnVia(owner, boardId, "Done");
    await createCardVia(owner, boardId, todo);

    await put(owner, `/api/v1/columns/${todo}`, { archived: true }).expect(200);

    let board = await getBoard(owner, boardId);
    expect(board.columnOrderIds).toEqual([done]);
    expect(board.columns.map((column: { _id: string }) => column._id)).toEqual([done]);
    const archived = await getArchived(owner, boardId);
    expect(archived.columns.map((column: { _id: string }) => column._id)).toEqual([todo]);

    await put(owner, `/api/v1/columns/${todo}`, { archived: false }).expect(200);

    board = await getBoard(owner, boardId);
    expect(board.columnOrderIds).toEqual([todo, done]);
    expect(board.columns.find((column: { _id: string }) => column._id === todo).cards).toHaveLength(1);
  });
});
