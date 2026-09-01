import { Request as ExpressRequest } from "express";
import { ObjectId } from "mongodb";

import logger from "@workspace/shared/utils/logger";
import {
  type BoardUpdateReason,
  SOCKET_ID_HEADER,
  SOCKET_SERVER_EVENTS,
  socketRoom,
} from "@workspace/shared/utils/socket-events";

import {
  boardBroadcastCoalesced,
  boardBroadcastDuration,
  boardBroadcastFailures,
  boardBroadcastLocalRecipients,
  boardBroadcastSkipped,
} from "src/providers/metrics.provider";
import { getIo } from "src/providers/socket.provider";
import { boardService } from "src/services/board.service";
import type { AppServer } from "src/types/socket.type";

const COALESCE_WINDOW_MS = 120;

const hasViewersElsewhere = async (io: AppServer, room: string, actorSocketId: string): Promise<boolean> => {
  try {
    const socketIds = await io.of("/").adapter.sockets(new Set([room]));
    for (const socketId of socketIds) if (socketId !== actorSocketId) return true;
    return false;
  } catch (error) {
    logger.warn(`Could not count viewers of ${room}, broadcasting anyway: ${(error as Error).message}`);
    return true;
  }
};

const resolveBoardId = (boardId: unknown): string | undefined => {
  if (boardId instanceof ObjectId) return boardId.toString();
  if (typeof boardId === "string" && boardId.length > 0) return boardId;
  return undefined;
};

type BoardUpdate = { reason: BoardUpdateReason; actorId: string; actorSocketId: string };

const openWindows = new Map<string, NodeJS.Timeout>();
const foldedUpdates = new Map<string, BoardUpdate>();

const sendBoardUpdate = async (io: AppServer, boardId: string, update: BoardUpdate): Promise<void> => {
  const { reason, actorId, actorSocketId } = update;
  try {
    const room = socketRoom.board(boardId);

    const localRoom = io.of("/").adapter.rooms.get(room);
    const localRecipients = localRoom ? localRoom.size - (localRoom.has(actorSocketId) ? 1 : 0) : 0;
    boardBroadcastLocalRecipients.observe(localRecipients);

    if (localRecipients === 0 && !(await hasViewersElsewhere(io, room, actorSocketId))) {
      boardBroadcastSkipped.inc({ reason });
      return;
    }

    const stopTimer = boardBroadcastDuration.startTimer({ reason });
    try {
      const board = await boardService.getBoardSnapshot(boardId);
      if (!board) return;

      io.to(room)
        .except(actorSocketId)
        .emit(SOCKET_SERVER_EVENTS.BOARD_UPDATED, { boardId, reason, actorId, actorSocketId, board });
    } finally {
      stopTimer();
    }
  } catch (error) {
    boardBroadcastFailures.inc();
    logger.error(`Failed to broadcast board update for ${boardId}: ${(error as Error).message}`);
  }
};

const openWindow = (io: AppServer, boardId: string): void => {
  const timer = setTimeout(() => {
    openWindows.delete(boardId);
    const folded = foldedUpdates.get(boardId);
    if (folded === undefined) return;
    foldedUpdates.delete(boardId);

    void sendBoardUpdate(io, boardId, { ...folded, actorSocketId: "" });
    openWindow(io, boardId);
  }, COALESCE_WINDOW_MS);

  timer.unref();
  openWindows.set(boardId, timer);
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
  const update: BoardUpdate = { reason, actorId, actorSocketId };

  if (openWindows.has(boardId)) {
    foldedUpdates.set(boardId, update);
    boardBroadcastCoalesced.inc({ reason });
    return;
  }

  void sendBoardUpdate(io, boardId, update);
  openWindow(io, boardId);
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
