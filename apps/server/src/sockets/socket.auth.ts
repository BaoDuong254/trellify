import { parseCookie } from "cookie";

import { SOCKET_AUTH_ERRORS } from "@workspace/shared/utils/socket-events";

import environmentConfig from "src/config/environment";
import { JwtProvider } from "src/providers/jwt.provider";
import type { AppServer } from "src/types/socket.type";

export const registerSocketAuth = (io: AppServer): void => {
  io.use((socket, next) => {
    void (async (): Promise<void> => {
      try {
        const cookieHeader = socket.handshake.headers.cookie;
        const accessToken = cookieHeader ? parseCookie(cookieHeader).accessToken : undefined;

        if (!accessToken) {
          next(new Error(SOCKET_AUTH_ERRORS.NO_TOKEN));
          return;
        }

        const decoded = await JwtProvider.verifyToken(accessToken, environmentConfig.ACCESS_TOKEN_SECRET_SIGNATURE);

        if (typeof decoded !== "object" || typeof decoded._id !== "string") {
          next(new Error(SOCKET_AUTH_ERRORS.UNAUTHORIZED));
          return;
        }

        socket.data.user = {
          _id: decoded._id,
          email: typeof decoded.email === "string" ? decoded.email : "",
        };
        next();
      } catch (error) {
        const isExpired = error instanceof Error && error.name === "TokenExpiredError";
        next(new Error(isExpired ? SOCKET_AUTH_ERRORS.TOKEN_EXPIRED : SOCKET_AUTH_ERRORS.UNAUTHORIZED));
      }
    })();
  });
};
