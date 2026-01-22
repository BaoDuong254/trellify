import { configureStore } from "@reduxjs/toolkit";
import { activeBoardReducer } from "src/redux/activeBoard/activeBoardSlice";

export const store = configureStore({
  reducer: {
    activeBoard: activeBoardReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
