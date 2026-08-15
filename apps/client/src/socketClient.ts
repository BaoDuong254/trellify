import { io } from "socket.io-client";

import envConfig from "src/config/env";

export const socketIoInstance = io(envConfig.VITE_API_ENDPOINT, {
  withCredentials: true,
  autoConnect: false,
  transports: ["websocket"],
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10_000,
});
