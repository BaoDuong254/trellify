import { createSlice } from "@reduxjs/toolkit";
import type { Card } from "src/types/board.type";

interface ActiveCardState {
  currentActiveCard: Card | null;
  isShowModalActiveCard: boolean;
}

const initialState = {
  currentActiveCard: null,
  isShowModalActiveCard: false,
};

export const activeCardSlice = createSlice({
  name: "activeCard",
  initialState,
  reducers: {
    showModalActiveCard: (state) => {
      state.isShowModalActiveCard = true;
    },
    clearAndHideCurrentActiveCard: (state) => {
      state.currentActiveCard = null;
      state.isShowModalActiveCard = false;
    },
    updateCurrentActiveCard: (state, action) => {
      const fullCard = action.payload;
      state.currentActiveCard = fullCard;
    },
  },
});

export const { clearAndHideCurrentActiveCard, updateCurrentActiveCard, showModalActiveCard } = activeCardSlice.actions;

export const selectCurrentActiveCard = (state: { activeCard: ActiveCardState }) => {
  return state.activeCard.currentActiveCard;
};

export const selectIsShowModalActiveCard = (state: { activeCard: ActiveCardState }) => {
  return state.activeCard.isShowModalActiveCard;
};

export const activeCardReducer = activeCardSlice.reducer;
