import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { UserLoginType } from "@workspace/shared/schemas/user.schema";
import { toast } from "react-toastify";
import envConfig from "src/config/env";
import type { User } from "src/types/user.type";
import http from "src/utils/http";

export interface UserState {
  currentUser: User | null;
}

const initialState: UserState = {
  currentUser: null,
};

export const loginUserAPI = createAsyncThunk("user/loginUserAPI", async (data: UserLoginType) => {
  const response = await http.post(`${envConfig.VITE_API_ENDPOINT}/api/v1/users/login`, data);
  return response.data.data;
});

export const logoutUserAPI = createAsyncThunk("user/logoutUserAPI", async (showSuccessMessage: boolean) => {
  const response = await http.delete(`${envConfig.VITE_API_ENDPOINT}/api/v1/users/logout`);
  if (showSuccessMessage) {
    toast.success("Logged out successfully!");
  }
  return response.data.data;
});

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loginUserAPI.fulfilled, (state, action) => {
      const user = action.payload;
      state.currentUser = user;
    });
    builder.addCase(logoutUserAPI.fulfilled, (state) => {
      state.currentUser = null;
    });
  },
});

export const selectCurrentUser = (state: { user: UserState }) => {
  return state.user.currentUser;
};

export const userReducer = userSlice.reducer;
