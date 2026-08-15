import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { SOCKET_AUTH_ERRORS } from "@workspace/shared/utils/socket-events";

import { refreshTokenAPI } from "src/apis";
import type { AppDispatch } from "src/redux/store";
import { logoutUserAPI, selectCurrentUser } from "src/redux/user/userSlice";
import { socketIoInstance } from "src/socketClient";

export const useSocketConnection = (): void => {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector(selectCurrentUser);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!currentUser?._id) {
      socketIoInstance.disconnect();
      return;
    }

    const handleConnectError = (error: Error): void => {
      if (error.message === SOCKET_AUTH_ERRORS.TOKEN_EXPIRED) {
        if (isRefreshingRef.current) return;
        isRefreshingRef.current = true;

        refreshTokenAPI()
          .then(() => {
            if (!socketIoInstance.active) socketIoInstance.connect();
          })
          .catch(() => {
            dispatch(logoutUserAPI(false));
          })
          .finally(() => {
            isRefreshingRef.current = false;
          });
        return;
      }

      if (error.message === SOCKET_AUTH_ERRORS.NO_TOKEN || error.message === SOCKET_AUTH_ERRORS.UNAUTHORIZED) {
        dispatch(logoutUserAPI(false));
      }
    };

    socketIoInstance.on("connect_error", handleConnectError);
    socketIoInstance.connect();

    return (): void => {
      socketIoInstance.off("connect_error", handleConnectError);
    };
  }, [currentUser?._id, dispatch]);
};
