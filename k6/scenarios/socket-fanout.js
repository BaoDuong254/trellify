import { TEST_ID, sharedBoards, userForVU } from "../config/env.js";
import { thresholdsFor } from "../config/thresholds.js";
import { writeFlow } from "../lib/flows.js";
import { openBoardViewer } from "../lib/socketio.js";
import { buildSummary } from "../lib/summary.js";

const VIEWERS = Number(__ENV.SOCKET_VIEWERS ?? "25");
const BOARDS = Number(__ENV.SOCKET_BOARDS ?? "5");
const HOLD = Number(__ENV.SOCKET_HOLD ?? "300");
const WRITERS = Number(__ENV.SOCKET_WRITERS ?? "12");

// Viewers and writers must converge on the same few boards, otherwise every
// broadcast still reaches exactly one socket and there is no fan-out to measure.
const fanoutBoards = () => sharedBoards.slice(0, BOARDS);

export const options = {
  tags: { testid: TEST_ID },
  scenarios: {
    viewers: {
      executor: "per-vu-iterations",
      vus: VIEWERS,
      iterations: 1,
      maxDuration: `${HOLD + 60}s`,
      exec: "viewer",
    },
    writers: {
      executor: "constant-vus",
      vus: WRITERS,
      duration: `${HOLD}s`,
      startTime: "10s",
      exec: "writer",
    },
  },
  thresholds: thresholdsFor(["write"]),
};

export function viewer() {
  const boards = fanoutBoards();
  const board = boards[(__VU - 1) % boards.length];
  openBoardViewer(userForVU(), board.boardId, HOLD);
}

export function writer() {
  const boards = fanoutBoards();
  writeFlow(userForVU(), boards[__ITER % boards.length]);
}

export function handleSummary(data) {
  return buildSummary(data);
}
