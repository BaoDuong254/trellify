import { Request as ExpressRequest } from "express";
import { ObjectId } from "mongodb";

import logger from "@workspace/shared/utils/logger";
import {
  type BoardUpdateReason,
  SOCKET_ID_HEADER,
  SOCKET_SERVER_EVENTS,
  socketRoom,
} from "@workspace/shared/utils/socket-events";

import { getIo } from "src/providers/socket.provider";
import { boardService } from "src/services/board.service";

const resolveBoardId = (boardId: unknown): string | undefined => {
  if (boardId instanceof ObjectId) return boardId.toString();
  if (typeof boardId === "string" && boardId.length > 0) return boardId;
  return undefined;
};

export const broadcastBoardUpdate = (request: ExpressRequest, rawBoardId: unknown, reason: BoardUpdateReason): void => {
  const io = getIo();
  const boardId = resolveBoardId(rawBoardId);
  if (!io || !boardId) return;

  const socketIdHeader = request.headers[SOCKET_ID_HEADER];
  // Empty string when the caller has no socket (Postman, curl). `.except("")`
  // excludes a room nobody is in, so the broadcast still reaches every viewer.
  const actorSocketId = typeof socketIdHeader === "string" ? socketIdHeader : "";
  const actorId = typeof request.jwtDecoded === "object" ? String(request.jwtDecoded?._id ?? "") : "";

  void (async (): Promise<void> => {
    try {
      const board = await boardService.getBoardSnapshot(boardId);
      if (!board) return;

      io.to(socketRoom.board(boardId))
        .except(actorSocketId)
        .emit(SOCKET_SERVER_EVENTS.BOARD_UPDATED, { boardId, reason, actorId, actorSocketId, board });
    } catch (error) {
      logger.error(`Failed to broadcast board update for ${boardId}: ${(error as Error).message}`);
    }
  })();
};

export const evictUserFromBoardRoom = async (boardId: string, userId: string): Promise<void> => {
  const io = getIo();
  if (!io) return;

  void (async (): Promise<void> => {
    try {
      const boardRoom = socketRoom.board(boardId);
      // Adapter-aware, so this reaches the user's sockets on every scaled instance.
      const sockets = await io.in(socketRoom.user(userId)).fetchSockets();
      for (const socket of sockets) socket.leave(boardRoom);

      io.to(socketRoom.user(userId)).emit(SOCKET_SERVER_EVENTS.BOARD_ACCESS_DENIED, { boardId });
    } catch (error) {
      logger.error(`Failed to evict ${userId} from board ${boardId}: ${(error as Error).message}`);
    }
  })();
};
