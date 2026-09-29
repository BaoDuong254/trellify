import { useCallback, useEffect, useState } from "react";

import { fetchStarredBoardsAPI, setBoardStarredAPI } from "src/apis";
import type { BoardLink } from "src/types/board.type";

export const useStarredBoards = (): {
  starredBoards: BoardLink[];
  isStarred: (boardId?: string) => boolean;
  toggleStar: (board: BoardLink) => void;
} => {
  const [starredBoards, setStarredBoards] = useState<BoardLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchStarredBoardsAPI()
      .then((boards) => {
        if (!cancelled) setStarredBoards(boards);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const isStarred = useCallback(
    (boardId?: string) => starredBoards.some((board) => board._id === boardId),
    [starredBoards]
  );

  const toggleStar = (board: BoardLink) => {
    const starred = !isStarred(board._id);
    const previous = starredBoards;
    setStarredBoards(
      starred ? [...previous, { _id: board._id, title: board.title }] : previous.filter((b) => b._id !== board._id)
    );
    setBoardStarredAPI(board._id, starred).catch(() => setStarredBoards(previous));
  };

  return { starredBoards, isStarred, toggleStar };
};
