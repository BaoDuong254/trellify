import { sleep } from "k6";

import { ownBoard, sharedBoardOfSize, writeBoard } from "../config/env.js";
import { thinkSeconds } from "../config/profiles.js";
import * as api from "./api.js";
import { attachSession, clearSession } from "./auth.js";
import { expectStatus, jsonData } from "./checks.js";
import { authFlowDuration, readFlowDuration, writeFlowDuration } from "./metrics.js";

const think = () => {
  const seconds = thinkSeconds();
  if (seconds > 0) sleep(seconds);
};

const label = () => `${__VU}-${__ITER}`;

const boardToRead = (user) => {
  const rotation = __ITER % 5;
  if (rotation === 0) return sharedBoardOfSize("large") ?? ownBoard(user);
  if (rotation === 1) return sharedBoardOfSize("medium") ?? ownBoard(user);
  return ownBoard(user);
};

export function readFlow(user) {
  const startedAt = Date.now();
  attachSession(user);

  const page = (__ITER % 2) + 1;
  expectStatus(api.listBoards(page, 12), 200, "boards_list");
  think();

  const board = boardToRead(user);
  expectStatus(api.getBoardDetails(board.boardId, board.size), 200, "board_details");

  readFlowDuration.add(Date.now() - startedAt);
}

export function writeFlow(user, board) {
  const startedAt = Date.now();
  attachSession(user);

  const boardId = (board ?? writeBoard(user)).boardId;

  const columnAResponse = api.createColumn(boardId, `k6-col-a-${label()}`);
  if (!expectStatus(columnAResponse, 201, "column_create")) return;
  const columnA = jsonData(columnAResponse);

  const columnBResponse = api.createColumn(boardId, `k6-col-b-${label()}`);
  if (!expectStatus(columnBResponse, 201, "column_create")) return;
  const columnB = jsonData(columnBResponse);

  const cardIds = [];
  for (let index = 0; index < 2; index++) {
    const cardResponse = api.createCard(boardId, columnA._id, `k6-card-${label()}-${index}`);
    if (!expectStatus(cardResponse, 201, "card_create")) return;
    cardIds.push(jsonData(cardResponse)._id);
  }

  think();

  expectStatus(
    api.updateCard(cardIds[0], {
      title: `k6-card-updated-${label()}`,
      description: "Updated by k6 load test",
    }),
    200,
    "card_update"
  );

  expectStatus(
    api.updateCard(cardIds[0], {
      commentToAdd: {
        userAvatar: null,
        userDisplayName: user.email,
        content: `k6 comment ${label()}`,
      },
    }),
    200,
    "card_comment"
  );

  expectStatus(
    api.moveCard({
      currentCardId: cardIds[0],
      prevColumnId: columnA._id,
      prevCardOrderIds: [cardIds[1]],
      nextColumnId: columnB._id,
      nextCardOrderIds: [cardIds[0]],
    }),
    200,
    "card_move"
  );

  expectStatus(api.deleteColumn(columnA._id), 200, "column_delete");
  expectStatus(api.deleteColumn(columnB._id), 200, "column_delete");

  writeFlowDuration.add(Date.now() - startedAt);
}

export function authFlow(user) {
  const startedAt = Date.now();
  clearSession();

  expectStatus(api.login(user.email, user.password), 200, "login");

  attachSession(user);
  expectStatus(api.refreshToken(), 200, "refresh_token");
  expectStatus(api.logout(), 200, "logout");

  clearSession();
  authFlowDuration.add(Date.now() - startedAt);
}
