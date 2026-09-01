import { BOARD_ROOM_PAYLOAD_SCHEMA } from "@workspace/shared/schemas/socket.schema";
import logger from "@workspace/shared/utils/logger";
import {
  SOCKET_ACK_ERRORS,
  SOCKET_CLIENT_EVENTS,
  SOCKET_SERVER_EVENTS,
  parseBoardRoom,
  socketRoom,
} from "@workspace/shared/utils/socket-events";

import { boardService } from "src/services/board.service";
import { addBoardViewer, reconcileBoardViewers, removeBoardViewer } from "src/sockets/board/board.viewers";
import type { AppServer, AppSocket } from "src/types/socket.type";

const emitBoardPresence = async (io: AppServer, boardId: string, excludeSocketId?: string): Promise<void> => {
  const room = socketRoom.board(boardId);
  const sockets = await io.in(room).fetchSockets();
  const present = sockets.filter((socket) => socket.id !== excludeSocketId);
  const userIds = [...new Set(present.map((socket) => socket.data.user._id))];

  await reconcileBoardViewers(
    boardId,
    present.map((socket) => socket.id)
  );

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

      try {
        await addBoardViewer(boardId, socket.id);
      } catch (error) {
        logger.error(`Could not register ${socket.id} as a viewer of ${boardId}: ${(error as Error).message}`);
        ack?.({ ok: false, error: SOCKET_ACK_ERRORS.PRESENCE_UNAVAILABLE });
        return;
      }

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
      await removeBoardViewer(boardId, socket.id);
      await emitBoardPresence(io, boardId);
    })();
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      const boardId = parseBoardRoom(room);
      if (!boardId) continue;

      void (async (): Promise<void> => {
        await removeBoardViewer(boardId, socket.id);
        await emitBoardPresence(io, boardId, socket.id);
      })();
    }
  });
};
