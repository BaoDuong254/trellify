import { describe, expect, it } from "vitest";

import { buildBoard, buildCard, buildColumn, buildUser } from "src/test/fixtures";
import { normalizeBoard } from "src/utils/board";

describe("normalizeBoard", () => {
  it("orders columns by columnOrderIds and cards by cardOrderIds", () => {
    const board = buildBoard({
      columnOrderIds: ["column-2", "column-1"],
      columns: [
        buildColumn({
          _id: "column-1",
          cardOrderIds: ["card-b", "card-a"],
          cards: [buildCard({ _id: "card-a" }), buildCard({ _id: "card-b" })],
        }),
        buildColumn({ _id: "column-2", cardOrderIds: ["card-c"], cards: [buildCard({ _id: "card-c" })] }),
      ],
    });

    const normalized = normalizeBoard(board);

    expect(normalized.columns.map((column) => column._id)).toEqual(["column-2", "column-1"]);
    expect(normalized.columns[1]?.cards.map((card) => card._id)).toEqual(["card-b", "card-a"]);
  });

  it("gives an empty column a single placeholder card so it stays a drop target", () => {
    const board = buildBoard({ columnOrderIds: ["column-1"], columns: [buildColumn({ _id: "column-1" })] });

    const [column] = normalizeBoard(board).columns;

    expect(column?.cards).toHaveLength(1);
    expect(column?.cards[0]).toMatchObject({ _id: "column-1-placeholder-card", FE_PlaceholderCard: true });
    expect(column?.cardOrderIds).toEqual(["column-1-placeholder-card"]);
  });

  it("merges owners and members into FE_allUsers", () => {
    const owner = buildUser({ _id: "user-1" });
    const member = buildUser({ _id: "user-2" });
    const board = buildBoard({ owners: [owner], members: [member] });

    expect(normalizeBoard(board).FE_allUsers).toEqual([owner, member]);
  });

  it("does not mutate the incoming board", () => {
    const board = buildBoard({ columnOrderIds: ["column-1"], columns: [buildColumn({ _id: "column-1" })] });

    normalizeBoard(board);

    expect(board.columns[0]?.cards).toEqual([]);
  });
});
