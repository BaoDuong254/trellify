import type { DefaultEventsMap, Server, Socket } from "socket.io";

import type {
  BoardAccessDeniedPayloadType,
  BoardPresencePayloadType,
  BoardUpdatedPayloadType,
  SocketAckType,
} from "@workspace/shared/schemas/socket.schema";
import { SOCKET_CLIENT_EVENTS, SOCKET_SERVER_EVENTS } from "@workspace/shared/utils/socket-events";

interface SocketData {
  user: {
    _id: string;
    email: string;
  };
}

interface ClientToServerEvents {
  [SOCKET_CLIENT_EVENTS.JOIN_BOARD]: (payload: unknown, ack?: (response: SocketAckType) => void) => void;
  [SOCKET_CLIENT_EVENTS.LEAVE_BOARD]: (payload: unknown) => void;
}

interface ServerToClientEvents {
  [SOCKET_SERVER_EVENTS.BOARD_UPDATED]: (payload: BoardUpdatedPayloadType) => void;
  [SOCKET_SERVER_EVENTS.BOARD_PRESENCE]: (payload: BoardPresencePayloadType) => void;
  [SOCKET_SERVER_EVENTS.BOARD_ACCESS_DENIED]: (payload: BoardAccessDeniedPayloadType) => void;
  [SOCKET_SERVER_EVENTS.USER_INVITED_TO_BOARD]: (payload: unknown) => void;
}

export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;
export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;
