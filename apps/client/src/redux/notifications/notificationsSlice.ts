import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import envConfig from "src/config/env";
import type { Notifications } from "src/types/invitation.type";
import http from "src/utils/http";

interface NotificationsState {
  currentNotifications: Notifications[] | null;
}

const initialState: NotificationsState = {
  currentNotifications: null,
};

export const fetchInvitationsAPI = createAsyncThunk("notifications/fetchInvitationsAPI", async () => {
  const response = await http.get(`${envConfig.VITE_API_ENDPOINT}/api/v1/invitations`);
  return response.data.data;
});

export const updateBoardInvitationAPI = createAsyncThunk(
  "notifications/updateBoardInvitationAPI",
  async ({ status, invitationId }: { status: string; invitationId: string }) => {
    const response = await http.put(`${envConfig.VITE_API_ENDPOINT}/api/v1/invitations/board/${invitationId}`, {
      status,
    });
    return response.data.data;
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const incomingInvitation = action.payload;
      state.currentNotifications?.unshift(incomingInvitation);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchInvitationsAPI.fulfilled, (state, action) => {
      const incomingInvitations = action.payload;
      state.currentNotifications = Array.isArray(incomingInvitations) ? incomingInvitations.reverse() : [];
    });
    builder.addCase(updateBoardInvitationAPI.fulfilled, (state, action) => {
      const incomingInvitation = action.payload;
      const getInvitation = state.currentNotifications?.find((i) => i._id === incomingInvitation._id);
      if (getInvitation) getInvitation.boardInvitation = incomingInvitation.boardInvitation;
    });
  },
});

export const { addNotification } = notificationsSlice.actions;

export const selectCurrentNotifications = (state: { notifications: NotificationsState }) => {
  return state.notifications.currentNotifications;
};

export const notificationsReducer = notificationsSlice.reducer;
