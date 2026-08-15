import { type PayloadAction, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";

import { BOARD_INVITATION_STATUS } from "@workspace/shared/utils/constants";

import envConfig from "src/config/env";
import type { Notifications } from "src/types/invitation.type";
import http from "src/utils/http";

interface NotificationsState {
  currentNotifications: Notifications[] | null;
}

const initialState: NotificationsState = {
  currentNotifications: null,
};

export const fetchInvitationsAPI = createAsyncThunk<Notifications[], void>(
  "notifications/fetchInvitationsAPI",
  async () => {
    const response = await http.get(`${envConfig.VITE_API_ENDPOINT}/api/v1/invitations`);
    return response.data.data as Notifications[];
  }
);

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
    addNotification: (state, action: PayloadAction<Notifications>) => {
      const incomingInvitation = action.payload;
      state.currentNotifications ??= [];
      if (state.currentNotifications.some((item) => item._id === incomingInvitation._id)) return;
      state.currentNotifications.unshift(incomingInvitation);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchInvitationsAPI.fulfilled, (state, action) => {
      const incomingInvitations = Array.isArray(action.payload) ? [...action.payload].reverse() : [];
      const incomingIds = new Set(incomingInvitations.map((item) => item._id));
      const socketOnlyInvitations = (state.currentNotifications ?? []).filter((item) => !incomingIds.has(item._id));
      state.currentNotifications = [...socketOnlyInvitations, ...incomingInvitations];
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

export const selectPendingInvitationCount = createSelector([selectCurrentNotifications], (notifications): number => {
  return (notifications ?? []).filter(
    (notification) => notification.boardInvitation?.status === BOARD_INVITATION_STATUS.PENDING
  ).length;
});

export const notificationsReducer = notificationsSlice.reducer;
