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

export const rememberRecentBoard = (board: BoardLink): void => {
  const next = [{ _id: board._id, title: board.title }, ...getRecentBoards().filter((item) => item._id !== board._id)];
  try {
    localStorage.setItem(RECENT_BOARDS_KEY, JSON.stringify(next.slice(0, MAX_RECENT_BOARDS)));
  } catch {
    return;
  }
};
