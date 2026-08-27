import type { Socket } from "socket.io-client";

import envConfig from "src/config/env";

let socket: Socket | null = null;
let pending: Promise<Socket> | null = null;

export const getSocket = (): Socket | null => socket;

export const getSocketId = (): string => socket?.id ?? "";

export const ensureSocket = async (): Promise<Socket> => {
  if (socket) return socket;
  pending ??= import("socket.io-client").then(({ io }) => {
    socket = io(envConfig.VITE_API_ENDPOINT, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });
    pending = null;
    return socket;
  });
  return pending;
};
