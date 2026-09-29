import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  type BoardLoadError,
  fetchBoardDetailsAPI,
  setCardFilter,
  updateCurrentActiveBoard,
} from "src/redux/activeBoard/activeBoardSlice";
import type { AppDispatch } from "src/redux/store";
import { EMPTY_CARD_FILTER } from "src/utils/cardFilter";
import { forgetRecentBoard } from "src/utils/recentBoards";

const BOARD_GONE_STATUSES = new Set([403, 404]);

const statusOf = (error: unknown): number | null =>
  typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
    ? error.status
    : null;

export const useBoardLoader = (
  boardId: string | undefined
): { loadError: BoardLoadError | null; retry: () => void } => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const [failure, setFailure] = useState<{ boardId: string; reloadKey: number; error: BoardLoadError } | null>(null);

  useEffect(() => {
    if (!boardId) return;
    let cancelled = false;
    dispatch(updateCurrentActiveBoard(null));
    dispatch(setCardFilter(EMPTY_CARD_FILTER));
    dispatch(fetchBoardDetailsAPI(boardId))
      .unwrap()
      .catch((error: unknown) => {
        if (cancelled) return;
        const status = statusOf(error);
        if (status !== null && BOARD_GONE_STATUSES.has(status)) {
          forgetRecentBoard(boardId);
          navigate("/boards", { replace: true });
          return;
        }
        setFailure({ boardId, reloadKey, error: { status } });
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, navigate, boardId, reloadKey]);

  const loadError = failure && failure.boardId === boardId && failure.reloadKey === reloadKey ? failure.error : null;

  return { loadError, retry: () => setReloadKey((key) => key + 1) };
};
