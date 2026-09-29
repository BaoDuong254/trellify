import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { isAxiosError } from "axios";

import envConfig from "src/config/env";
import type { Board } from "src/types/board.type";
import { normalizeBoard } from "src/utils/board";
import { type CardFilter, EMPTY_CARD_FILTER } from "src/utils/cardFilter";
import http from "src/utils/http";
import { recordBoardLoadTime } from "src/utils/metrics";

export interface ActiveBoardState {
  currentActiveBoard: Board | null;
  cardFilter: CardFilter;
}

const initialState: ActiveBoardState = {
  currentActiveBoard: null,
  cardFilter: EMPTY_CARD_FILTER,
};

export interface BoardLoadError {
  status: number | null;
}

export const fetchBoardDetailsAPI = createAsyncThunk<Board, string, { rejectValue: BoardLoadError }>(
  "activeBoard/fetchBoardDetailsAPI",
  async (boardId, { rejectWithValue }) => {
    try {
      const startedAt = performance.now();
      const response = await http.get(`${envConfig.VITE_API_ENDPOINT}/api/v1/boards/${boardId}`);
      recordBoardLoadTime(performance.now() - startedAt);
      return response.data.data;
    } catch (error) {
      return rejectWithValue({ status: isAxiosError(error) ? (error.response?.status ?? null) : null });
    }
  }
);

const activeBoardSlice = createSlice({
  name: "activeBoard",
  initialState,
  reducers: {
    updateCurrentActiveBoard: (state, action) => {
      state.currentActiveBoard = action.payload;
    },
    setCardFilter: (state, action: PayloadAction<CardFilter>) => {
      state.cardFilter = action.payload;
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

export const { updateCurrentActiveBoard, updateCardInBoard, setCardFilter } = activeBoardSlice.actions;

export const selectCurrentActiveBoard = (state: { activeBoard: ActiveBoardState }) => {
  return state.activeBoard.currentActiveBoard;
};

export const selectCardFilter = (state: { activeBoard: ActiveBoardState }) => state.activeBoard.cardFilter;

export const activeBoardReducer = activeBoardSlice.reducer;
