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
      const board = action.payload as Board;
      board.FE_allUsers = board.owners?.concat(board.members);
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

export const { updateCurrentActiveBoard, updateCardInBoard } = activeBoardSlice.actions;

export const selectCurrentActiveBoard = (state: { activeBoard: ActiveBoardState }) => {
  return state.activeBoard.currentActiveBoard;
};

export const activeBoardReducer = activeBoardSlice.reducer;
