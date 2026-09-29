import type { BoardLink } from "src/types/board.type";

const RECENT_BOARDS_KEY = "trellify:recent-boards";
const MAX_RECENT_BOARDS = 8;

export const getRecentBoards = (): BoardLink[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_BOARDS_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is BoardLink => typeof item?._id === "string" && typeof item?.title === "string")
      : [];
  } catch {
    return [];
  }
};

const writeRecentBoards = (boards: BoardLink[]): void => {
  try {
    localStorage.setItem(RECENT_BOARDS_KEY, JSON.stringify(boards.slice(0, MAX_RECENT_BOARDS)));
  } catch {
    return;
  }
};

export const rememberRecentBoard = (board: BoardLink): void => {
  writeRecentBoards([
    { _id: board._id, title: board.title },
    ...getRecentBoards().filter((item) => item._id !== board._id),
  ]);
};

export const forgetRecentBoard = (boardId: string): void => {
  writeRecentBoards(getRecentBoards().filter((item) => item._id !== boardId));
};
