import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type {
  BoardAccessDeniedPayloadType,
  BoardPresencePayloadType,
  BoardUpdatedPayloadType,
  SocketAckType,
} from "@workspace/shared/schemas/socket.schema";
import { SOCKET_ACK_ERRORS, SOCKET_CLIENT_EVENTS, SOCKET_SERVER_EVENTS } from "@workspace/shared/utils/socket-events";

import { fetchBoardDetailsAPI, updateCurrentActiveBoard } from "src/redux/activeBoard/activeBoardSlice";
import { updateCurrentActiveCard } from "src/redux/activeCard/activeCardSlice";
import type { AppDispatch } from "src/redux/store";
import { ensureSocket, getSocket } from "src/socketClient";
import type { Board, Card } from "src/types/board.type";
import { normalizeBoard } from "src/utils/board";
import { isBoardDragging, subscribeToDragEnd } from "src/utils/boardDragState";

export const useBoardSocket = (boardId?: string, activeCardId?: string): { presentUserIds: string[] } => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [presentUserIds, setPresentUserIds] = useState<string[]>([]);

  const pendingBoardRef = useRef<Board | null>(null);
  const wasConnectedRef = useRef(false);
  const activeCardIdRef = useRef(activeCardId);
  useEffect(() => {
    activeCardIdRef.current = activeCardId;
  }, [activeCardId]);

  useEffect(() => {
    if (!boardId) return;

    let cancelled = false;
    let detach: (() => void) | undefined;

    const applyBoard = (rawBoard: Board): void => {
      const board = normalizeBoard(rawBoard);
      dispatch(updateCurrentActiveBoard(board));

      const openCardId = activeCardIdRef.current;
      if (openCardId) {
        const openCard = board.columns.flatMap((column) => column.cards).find((card: Card) => card._id === openCardId);
        if (openCard) dispatch(updateCurrentActiveCard(openCard));
      }
    };

    const joinRoom = (): void => {
      getSocket()?.emit(SOCKET_CLIENT_EVENTS.JOIN_BOARD, { boardId }, (ack: SocketAckType) => {
        if (!ack?.ok && ack?.error !== SOCKET_ACK_ERRORS.BOARD_ACCESS_DENIED) {
          toast.error("Could not sync this board in real time.");
        }
      });
    };

    const handleConnect = (): void => {
      joinRoom();
      if (wasConnectedRef.current) dispatch(fetchBoardDetailsAPI(boardId));
      wasConnectedRef.current = true;
    };

    const handleBoardUpdated = (payload: BoardUpdatedPayloadType<Board>): void => {
      if (payload.boardId !== boardId) return;
      if (payload.actorSocketId && payload.actorSocketId === getSocket()?.id) return;

      if (isBoardDragging()) {
        pendingBoardRef.current = payload.board;
        return;
      }
      applyBoard(payload.board);
    };

    const handlePresence = (payload: BoardPresencePayloadType): void => {
      if (payload.boardId === boardId) setPresentUserIds(payload.userIds);
    };

    const handleAccessDenied = (payload: BoardAccessDeniedPayloadType): void => {
      if (payload.boardId !== boardId) return;
      toast.warning("You no longer have access to this board.");
      navigate("/boards", { replace: true });
    };

    void ensureSocket().then((socket) => {
      if (cancelled) return;

      wasConnectedRef.current = socket.connected;

      socket.on("connect", handleConnect);
      socket.on(SOCKET_SERVER_EVENTS.BOARD_UPDATED, handleBoardUpdated);
      socket.on(SOCKET_SERVER_EVENTS.BOARD_PRESENCE, handlePresence);
      socket.on(SOCKET_SERVER_EVENTS.BOARD_ACCESS_DENIED, handleAccessDenied);
      if (socket.connected) joinRoom();

      detach = (): void => {
        socket.off("connect", handleConnect);
        socket.off(SOCKET_SERVER_EVENTS.BOARD_UPDATED, handleBoardUpdated);
        socket.off(SOCKET_SERVER_EVENTS.BOARD_PRESENCE, handlePresence);
        socket.off(SOCKET_SERVER_EVENTS.BOARD_ACCESS_DENIED, handleAccessDenied);
        if (socket.connected) socket.emit(SOCKET_CLIENT_EVENTS.LEAVE_BOARD, { boardId });
      };
    });

    const unsubscribeDragEnd = subscribeToDragEnd(() => {
      const pendingBoard = pendingBoardRef.current;
      pendingBoardRef.current = null;
      if (pendingBoard) applyBoard(pendingBoard);
    });

    return (): void => {
      cancelled = true;
      unsubscribeDragEnd();
      detach?.();
      pendingBoardRef.current = null;
      setPresentUserIds([]);
    };
  }, [boardId, dispatch, navigate]);

  return { presentUserIds };
};
