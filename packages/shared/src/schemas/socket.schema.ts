import { z } from "zod";

import type { BoardUpdateReason } from "@workspace/shared/utils/socket-events";
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "@workspace/shared/utils/validators";

export const BOARD_ROOM_PAYLOAD_SCHEMA = z.object({
  boardId: z.string({ error: "Error.BoardIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
});

export interface SocketAckType {
  ok: boolean;
  error?: string;
}

export interface BoardPresencePayloadType {
  boardId: string;
  userIds: string[];
}

export interface BoardUpdatedPayloadType<TBoard = unknown> {
  boardId: string;
  reason: BoardUpdateReason;
  actorId: string;
  actorSocketId: string;
  board: TBoard;
}

export interface BoardAccessDeniedPayloadType {
  boardId: string;
}
