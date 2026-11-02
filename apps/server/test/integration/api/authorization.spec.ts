import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import {
  type TestUser,
  addBoardMember,
  createActiveUser,
  createBoardVia,
  createCardVia,
  createColumnVia,
  getApp,
} from "test/integration/helpers";

type Method = "get" | "post" | "put" | "delete";

interface Fixture {
  owner: TestUser;
  member: TestUser;
  otherMember: TestUser;
  outsider: TestUser;
  boardId: string;
  columnId: string;
  otherColumnId: string;
  cardId: string;
}

interface RouteCase {
  name: string;
  method: Method;
  path: (fixture: Fixture) => string;
  body?: (fixture: Fixture) => object;
  outsiderStatus?: number;
}

const moveCardBody = ({ cardId, columnId, otherColumnId }: Fixture): object => ({
  currentCardId: cardId,
  prevColumnId: columnId,
  prevCardOrderIds: [],
  nextColumnId: otherColumnId,
  nextCardOrderIds: [cardId],
});

const BOARD_SCOPED_ROUTES: RouteCase[] = [
  {
    name: "GET /boards/:id",
    method: "get",
    path: (f) => `/api/v1/boards/${f.boardId}`,
    outsiderStatus: StatusCodes.NOT_FOUND,
  },
  { name: "GET /boards/:id/archived", method: "get", path: (f) => `/api/v1/boards/${f.boardId}/archived` },
  { name: "PUT /boards/:id", method: "put", path: (f) => `/api/v1/boards/${f.boardId}`, body: () => ({ labels: [] }) },
  { name: "DELETE /boards/:id", method: "delete", path: (f) => `/api/v1/boards/${f.boardId}` },
  {
    name: "PUT /boards/:id/star",
    method: "put",
    path: (f) => `/api/v1/boards/${f.boardId}/star`,
    body: () => ({ starred: true }),
  },
  {
    name: "DELETE /boards/:id/members/:userId",
    method: "delete",
    path: (f) => `/api/v1/boards/${f.boardId}/members/${f.otherMember.userId}`,
  },
  {
    name: "PUT /boards/supports/moving_card",
    method: "put",
    path: () => "/api/v1/boards/supports/moving_card",
    body: moveCardBody,
  },
  {
    name: "POST /columns",
    method: "post",
    path: () => "/api/v1/columns",
    body: (f) => ({ boardId: f.boardId, title: "Injected" }),
  },
  {
    name: "PUT /columns/:id",
    method: "put",
    path: (f) => `/api/v1/columns/${f.columnId}`,
    body: () => ({ title: "Injected" }),
  },
  { name: "DELETE /columns/:id", method: "delete", path: (f) => `/api/v1/columns/${f.columnId}` },
  {
    name: "POST /cards",
    method: "post",
    path: () => "/api/v1/cards",
    body: (f) => ({ boardId: f.boardId, columnId: f.columnId, title: "Injected" }),
  },
  {
    name: "PUT /cards/:id",
    method: "put",
    path: (f) => `/api/v1/cards/${f.cardId}`,
    body: () => ({ title: "Injected" }),
  },
  { name: "DELETE /cards/:id", method: "delete", path: (f) => `/api/v1/cards/${f.cardId}` },
  { name: "GET /cards/:id/comments", method: "get", path: (f) => `/api/v1/cards/${f.cardId}/comments` },
  { name: "GET /cards/:id/activities", method: "get", path: (f) => `/api/v1/cards/${f.cardId}/activities` },
  {
    name: "POST /invitations/board",
    method: "post",
    path: () => "/api/v1/invitations/board",
    body: (f) => ({ inviteeEmail: f.member.email, boardId: f.boardId }),
  },
];

const OWNER_ONLY_ROUTES = BOARD_SCOPED_ROUTES.filter(({ name }) =>
  ["DELETE /boards/:id", "DELETE /boards/:id/members/:userId"].includes(name)
);

const send = (route: RouteCase, fixture: Fixture, actor?: TestUser): request.Test => {
  const pending = request(getApp())[route.method](route.path(fixture));
  if (actor) void pending.set("Cookie", actor.cookie);
  return pending.send(route.body?.(fixture));
};

describe("route authorization matrix", () => {
  let fixture: Fixture;

  beforeEach(async () => {
    const owner = await createActiveUser("owner");
    const member = await createActiveUser("member");
    const outsider = await createActiveUser("outsider");
    const boardId = await createBoardVia(owner);
    await addBoardMember(boardId, member.userId);
    const otherMember = await createActiveUser("other-member");
    await addBoardMember(boardId, otherMember.userId);
    const columnId = await createColumnVia(owner, boardId);
    const otherColumnId = await createColumnVia(owner, boardId, "Done");
    const cardId = await createCardVia(owner, boardId, columnId);
    fixture = { owner, member, otherMember, outsider, boardId, columnId, otherColumnId, cardId };
  });

  it.each(BOARD_SCOPED_ROUTES)("$name refuses an anonymous request", async (route) => {
    const response = await send(route, fixture);

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it.each(BOARD_SCOPED_ROUTES)("$name refuses a user outside the board", async (route) => {
    const response = await send(route, fixture, fixture.outsider);

    expect(response.status).toBe(route.outsiderStatus ?? StatusCodes.FORBIDDEN);
  });

  it.each(OWNER_ONLY_ROUTES)("$name refuses a member who is not an owner", async (route) => {
    const response = await send(route, fixture, fixture.member);

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});
