export const SOCKET_CLIENT_EVENTS = {
  JOIN_BOARD: "FE_JOIN_BOARD",
  LEAVE_BOARD: "FE_LEAVE_BOARD",
} as const;

export const SOCKET_SERVER_EVENTS = {
  BOARD_UPDATED: "BE_BOARD_UPDATED",
  BOARD_PRESENCE: "BE_BOARD_PRESENCE",
  BOARD_ACCESS_DENIED: "BE_BOARD_ACCESS_DENIED",
  USER_INVITED_TO_BOARD: "BE_USER_INVITED_TO_BOARD",
} as const;

export const SOCKET_AUTH_ERRORS = {
  NO_TOKEN: "SOCKET_NO_TOKEN",
  TOKEN_EXPIRED: "SOCKET_TOKEN_EXPIRED",
  UNAUTHORIZED: "SOCKET_UNAUTHORIZED",
} as const;

export const SOCKET_ACK_ERRORS = {
  INVALID_PAYLOAD: "Error.InvalidSocketPayload",
  BOARD_ACCESS_DENIED: "Error.BoardAccessDenied",
} as const;

export const BOARD_UPDATE_REASONS = {
  BOARD_UPDATED: "BOARD_UPDATED",
  COLUMN_CREATED: "COLUMN_CREATED",
  COLUMN_UPDATED: "COLUMN_UPDATED",
  COLUMN_DELETED: "COLUMN_DELETED",
  CARD_CREATED: "CARD_CREATED",
  CARD_UPDATED: "CARD_UPDATED",
  CARD_DELETED: "CARD_DELETED",
  CARD_MOVED: "CARD_MOVED",
  MEMBER_JOINED: "MEMBER_JOINED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
} as const;

export const SOCKET_ID_HEADER = "x-socket-id";

const BOARD_ROOM_PREFIX = "board:";
const USER_ROOM_PREFIX = "user:";

export const socketRoom = {
  board: (boardId: string): string => `${BOARD_ROOM_PREFIX}${boardId}`,
  user: (userId: string): string => `${USER_ROOM_PREFIX}${userId}`,
};

export const parseBoardRoom = (room: string): string | null => {
  return room.startsWith(BOARD_ROOM_PREFIX) ? room.slice(BOARD_ROOM_PREFIX.length) : null;
};

export type BoardUpdateReason = (typeof BOARD_UPDATE_REASONS)[keyof typeof BOARD_UPDATE_REASONS];
