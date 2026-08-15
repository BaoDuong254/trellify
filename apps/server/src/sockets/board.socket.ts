import { BOARD_ROOM_PAYLOAD_SCHEMA } from "@workspace/shared/schemas/socket.schema";
import {
  SOCKET_ACK_ERRORS,
  SOCKET_CLIENT_EVENTS,
  SOCKET_SERVER_EVENTS,
  parseBoardRoom,
  socketRoom,
} from "@workspace/shared/utils/socket-events";

import { boardService } from "src/services/board.service";
import type { AppServer, AppSocket } from "src/types/socket.type";

const emitBoardPresence = async (io: AppServer, boardId: string, excludeSocketId?: string): Promise<void> => {
  const room = socketRoom.board(boardId);
  const sockets = await io.in(room).fetchSockets();
  const userIds = [
    ...new Set(sockets.filter((socket) => socket.id !== excludeSocketId).map((socket) => socket.data.user._id)),
  ];

  io.to(room).emit(SOCKET_SERVER_EVENTS.BOARD_PRESENCE, { boardId, userIds });
};

export const registerBoardSocketHandlers = (io: AppServer, socket: AppSocket): void => {
  socket.on(SOCKET_CLIENT_EVENTS.JOIN_BOARD, (payload, ack) => {
    void (async (): Promise<void> => {
      const parsed = BOARD_ROOM_PAYLOAD_SCHEMA.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: SOCKET_ACK_ERRORS.INVALID_PAYLOAD });
        return;
      }

      const { boardId } = parsed.data;
      if (!(await boardService.canUserAccessBoard(socket.data.user._id, boardId))) {
        socket.emit(SOCKET_SERVER_EVENTS.BOARD_ACCESS_DENIED, { boardId });
        ack?.({ ok: false, error: SOCKET_ACK_ERRORS.BOARD_ACCESS_DENIED });
        return;
      }

      await socket.join(socketRoom.board(boardId));
      ack?.({ ok: true });
      await emitBoardPresence(io, boardId);
    })();
  });

  socket.on(SOCKET_CLIENT_EVENTS.LEAVE_BOARD, (payload) => {
    void (async (): Promise<void> => {
      const parsed = BOARD_ROOM_PAYLOAD_SCHEMA.safeParse(payload);
      if (!parsed.success) return;

      const { boardId } = parsed.data;
      await socket.leave(socketRoom.board(boardId));
      await emitBoardPresence(io, boardId);
    })();
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      const boardId = parseBoardRoom(room);
      if (boardId) void emitBoardPresence(io, boardId, socket.id);
    }
  });
};
