import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { activeBoardReducer } from "src/redux/activeBoard/activeBoardSlice";
import { userReducer } from "src/redux/user/userSlice";
import storage from "redux-persist/lib/storage";
import { persistReducer } from "redux-persist";

const rootPersistConfig = {
  key: "root",
  storage: storage,
  whitelist: ["user"],
};

const reducers = combineReducers({
  activeBoard: activeBoardReducer,
  user: userReducer,
});

const persistedReducers = persistReducer(rootPersistConfig, reducers);

export const store = configureStore({
  reducer: persistedReducers,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
