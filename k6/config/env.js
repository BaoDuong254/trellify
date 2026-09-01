import { SharedArray } from "k6/data";

export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
export const API_URL = `${BASE_URL}/api/v1`;
export const WS_URL = BASE_URL.replace(/^http/, "ws");
export const TURNSTILE_TOKEN = __ENV.TURNSTILE_TOKEN || "loadtest";
export const TEST_ID = __ENV.TEST_ID || `local-${Date.now()}`;

export const SYSTEM_TAGS = [
  "proto",
  "status",
  "method",
  "name",
  "group",
  "scenario",
  "check",
  "error_code",
  "expected_response",
];

const USERS_PATH = __ENV.USERS_PATH || "../data/users.json";

export const seededUsers = new SharedArray("seeded users", () => JSON.parse(open(USERS_PATH)).users);
export const sharedBoards = new SharedArray("shared boards", () => JSON.parse(open(USERS_PATH)).sharedBoards);

export function userForVU() {
  return seededUsers[(__VU - 1) % seededUsers.length];
}

export function writeBoard(user) {
  return user.boards[0];
}

export function ownBoard(user) {
  return user.boards[__ITER % user.boards.length];
}

export function sharedBoardOfSize(size) {
  const matching = sharedBoards.filter((board) => board.size === size);
  if (matching.length === 0) return undefined;
  return matching[__ITER % matching.length];
}
