import { WebSocket } from "k6/websockets";

import { WS_URL } from "../config/env.js";
import { broadcastBytes, broadcastsReceived, socketJoinFailures } from "./metrics.js";

// Mirrors @workspace/shared/utils/socket-events. k6 scripts live outside the
// pnpm workspace and cannot import it, so keep these in sync by hand.
const JOIN_BOARD = "FE_JOIN_BOARD";
const BOARD_UPDATED = "BE_BOARD_UPDATED";

const ENGINE_IO_URL = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;

const EIO = { OPEN: "0", PING: "2", PONG: "3", MESSAGE: "4" };
const SIO = { CONNECT: "0", EVENT: "2", ACK: "3" };

export function openBoardViewer(user, boardId, holdSeconds, onClosed) {
  const socket = new WebSocket(ENGINE_IO_URL, null, {
    headers: { Cookie: `accessToken=${user.accessToken}` },
    tags: { endpoint: "socket_board", group: "socket", name: "socket_board" },
  });

  let joined = false;

  socket.onmessage = (message) => {
    const data = typeof message.data === "string" ? message.data : "";
    if (data.length === 0) return;

    // Engine.IO heartbeat: the server drops the connection if we never pong.
    if (data === EIO.PING) {
      socket.send(EIO.PONG);
      return;
    }

    if (data[0] === EIO.OPEN) {
      socket.send(`${EIO.MESSAGE}${SIO.CONNECT}`);
      return;
    }

    if (data[0] !== EIO.MESSAGE) return;
    const packet = data.slice(1);

    if (packet[0] === SIO.CONNECT) {
      socket.send(`${EIO.MESSAGE}${SIO.EVENT}1["${JOIN_BOARD}",{"boardId":"${boardId}"}]`);
      return;
    }

    if (packet.startsWith(`${SIO.ACK}1`)) {
      joined = packet.includes('"ok":true');
      if (!joined) socketJoinFailures.add(1);
      return;
    }

    if (packet[0] === SIO.EVENT && packet.includes(BOARD_UPDATED)) {
      broadcastsReceived.add(1);
      broadcastBytes.add(data.length);
    }
  };

  socket.onerror = () => {
    socketJoinFailures.add(1);
  };

  socket.onopen = () => {
    setTimeout(() => {
      socket.close();
    }, holdSeconds * 1000);
  };

  socket.onclose = () => {
    onClosed?.(joined);
  };

  return socket;
}
