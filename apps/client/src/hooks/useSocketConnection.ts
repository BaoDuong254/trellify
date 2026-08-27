import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { SOCKET_AUTH_ERRORS } from "@workspace/shared/utils/socket-events";

import { refreshTokenAPI } from "src/apis";
import type { AppDispatch } from "src/redux/store";
import { logoutUserAPI, selectCurrentUser } from "src/redux/user/userSlice";
import { ensureSocket, getSocket } from "src/socketClient";

export const useSocketConnection = (): void => {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector(selectCurrentUser);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!currentUser?._id) {
      getSocket()?.disconnect();
      return;
    }

    let cancelled = false;
    let detach: (() => void) | undefined;

    const handleConnectError = (error: Error): void => {
      if (error.message === SOCKET_AUTH_ERRORS.TOKEN_EXPIRED) {
        if (isRefreshingRef.current) return;
        isRefreshingRef.current = true;

        refreshTokenAPI()
          .then(() => {
            const socket = getSocket();
            if (socket && !socket.active) socket.connect();
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

    void ensureSocket().then((socket) => {
      if (cancelled) return;
      socket.on("connect_error", handleConnectError);
      socket.connect();
      detach = (): void => {
        socket.off("connect_error", handleConnectError);
      };
    });

    return (): void => {
      cancelled = true;
      detach?.();
    };
  }, [currentUser?._id, dispatch]);
};
