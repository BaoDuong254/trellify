import { configureStore } from "@reduxjs/toolkit";
import { HttpResponse, http as mock } from "msw";
import { describe, expect, it } from "vitest";

import {
  activeBoardReducer,
  fetchBoardDetailsAPI,
  updateCardInBoard,
  updateCurrentActiveBoard,
} from "src/redux/activeBoard/activeBoardSlice";
import { buildBoard, buildCard, buildColumn } from "src/test/fixtures";
import { apiUrl, server } from "src/test/server";
import { EMPTY_CARD_FILTER } from "src/utils/cardFilter";

describe("activeBoardSlice", () => {
  it("replaces the whole board on updateCurrentActiveBoard", () => {
    const board = buildBoard();

    const state = activeBoardReducer(
      { currentActiveBoard: null, cardFilter: EMPTY_CARD_FILTER },
      updateCurrentActiveBoard(board)
    );

    expect(state.currentActiveBoard).toEqual(board);
  });

  it("merges an updated card into the matching card of the matching column", () => {
    const board = buildBoard({
      columns: [buildColumn({ cards: [buildCard({ _id: "card-1", title: "Old" }), buildCard({ _id: "card-2" })] })],
    });

    const state = activeBoardReducer(
      { currentActiveBoard: board, cardFilter: EMPTY_CARD_FILTER },
      updateCardInBoard({ _id: "card-1", columnId: "column-1", title: "New" })
    );

    const cards = state.currentActiveBoard?.columns[0]?.cards;
    expect(cards?.[0]?.title).toBe("New");
    expect(cards?.[1]?.title).toBe("Write tests");
  });

  it("ignores a card update for a column that is not on the board", () => {
    const board = buildBoard({ columns: [buildColumn({ cards: [buildCard()] })] });

    const state = activeBoardReducer(
      { currentActiveBoard: board, cardFilter: EMPTY_CARD_FILTER },
      updateCardInBoard({ _id: "card-1", columnId: "other-column", title: "New" })
    );

    expect(state.currentActiveBoard?.columns[0]?.cards[0]?.title).toBe("Write tests");
  });

  it("normalizes the board returned by fetchBoardDetailsAPI", () => {
    const board = buildBoard({ columnOrderIds: ["column-1"], columns: [buildColumn({ _id: "column-1" })] });

    const state = activeBoardReducer(
      { currentActiveBoard: null, cardFilter: EMPTY_CARD_FILTER },
      fetchBoardDetailsAPI.fulfilled(board, "request-id", "board-1")
    );

    expect(state.currentActiveBoard?.columns[0]?.cards[0]?.FE_PlaceholderCard).toBe(true);
  });

  it("keeps the HTTP status when loading the board fails", async () => {
    server.use(
      mock.get(apiUrl("/api/v1/boards/board-1"), () => HttpResponse.json({ message: "gone" }, { status: 404 }))
    );
    const store = configureStore({ reducer: { activeBoard: activeBoardReducer } });

    const action = await store.dispatch(fetchBoardDetailsAPI("board-1"));

    expect(fetchBoardDetailsAPI.rejected.match(action)).toBe(true);
    expect(action.payload).toEqual({ status: 404 });
  });

  it("reports no status when the request never reached the server", async () => {
    server.use(mock.get(apiUrl("/api/v1/boards/board-1"), () => HttpResponse.error()));
    const store = configureStore({ reducer: { activeBoard: activeBoardReducer } });

    const action = await store.dispatch(fetchBoardDetailsAPI("board-1"));

    expect(action.payload).toEqual({ status: null });
  });
});
