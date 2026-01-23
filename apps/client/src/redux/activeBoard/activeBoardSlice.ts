import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { isEmpty } from "lodash";
import envConfig from "src/config/env";
import type { Board } from "src/types/board.type";
import { generatePlaceholderCard } from "src/utils/formatters";
import http from "src/utils/http";
import { mapOrder } from "src/utils/sort";

export interface ActiveBoardState {
  currentActiveBoard: Board | null;
}

const initialState: ActiveBoardState = {
  currentActiveBoard: null,
};

export const fetchBoardDetailsAPI = createAsyncThunk("activeBoard/fetchBoardDetailsAPI", async (boardId: string) => {
  const response = await http.get(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards/${boardId}`);
  return response.data.data;
});

export const activeBoardSlice = createSlice({
  name: "activeBoard",
  initialState,
  reducers: {
    updateCurrentActiveBoard: (state, action) => {
      state.currentActiveBoard = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchBoardDetailsAPI.fulfilled, (state, action) => {
      const board = action.payload as Board;
      board.columns = mapOrder(board.columns, board.columnOrderIds, "_id");

      board.columns.forEach((column) => {
        if (isEmpty(column.cards)) {
          column.cards = [generatePlaceholderCard(column)];
          column.cardOrderIds = [generatePlaceholderCard(column)._id];
        } else {
          column.cards = mapOrder(column.cards, column.cardOrderIds, "_id");
        }
      });
      state.currentActiveBoard = board;
    });
  },
});

export const { updateCurrentActiveBoard } = activeBoardSlice.actions;

export const selectCurrentActiveBoard = (state: { activeBoard: ActiveBoardState }) => {
  return state.activeBoard.currentActiveBoard;
};

export const activeBoardReducer = activeBoardSlice.reducer;
