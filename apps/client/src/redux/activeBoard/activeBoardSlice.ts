import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import envConfig from "src/config/env";
import type { Board } from "src/types/board.type";
import { normalizeBoard } from "src/utils/board";
import http from "src/utils/http";

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

const activeBoardSlice = createSlice({
  name: "activeBoard",
  initialState,
  reducers: {
    updateCurrentActiveBoard: (state, action) => {
      state.currentActiveBoard = action.payload;
    },
    updateCardInBoard: (state, action) => {
      const incomingCard = action.payload;
      const column = state.currentActiveBoard?.columns.find((i) => i._id === incomingCard.columnId);
      if (column) {
        const card = column.cards.find((i) => i._id === incomingCard._id);
        if (card) {
          Object.entries(incomingCard).forEach(([key, value]) => {
            (card as Record<string, unknown>)[key] = value;
          });
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchBoardDetailsAPI.fulfilled, (state, action) => {
      state.currentActiveBoard = normalizeBoard(action.payload as Board);
    });
  },
});

export const { updateCurrentActiveBoard, updateCardInBoard } = activeBoardSlice.actions;

export const selectCurrentActiveBoard = (state: { activeBoard: ActiveBoardState }) => {
  return state.activeBoard.currentActiveBoard;
};

export const activeBoardReducer = activeBoardSlice.reducer;
