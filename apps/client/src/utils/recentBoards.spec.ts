import { beforeEach, describe, expect, it } from "vitest";

import { forgetRecentBoard, getRecentBoards, rememberRecentBoard } from "src/utils/recentBoards";

const board = (index: number) => ({ _id: `board-${index}`, title: `Board ${index}` });

describe("recent boards", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps the most recent first, without duplicates, capped at 8", () => {
    for (let index = 0; index < 10; index++) rememberRecentBoard(board(index));
    rememberRecentBoard(board(5));

    const recent = getRecentBoards().map((item) => item._id);
    expect(recent).toHaveLength(8);
    expect(recent[0]).toBe("board-5");
    expect(new Set(recent).size).toBe(8);
  });

  it("forgets a board", () => {
    rememberRecentBoard(board(1));
    rememberRecentBoard(board(2));

    forgetRecentBoard("board-1");

    expect(getRecentBoards()).toEqual([board(2)]);
  });

  it("ignores corrupt storage", () => {
    localStorage.setItem("trellify:recent-boards", "{not json");
    expect(getRecentBoards()).toEqual([]);
  });
});
