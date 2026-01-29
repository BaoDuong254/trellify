import { io } from "socket.io-client";
import envConfig from "src/config/env";
export const socketIoInstance = io(envConfig.VITE_API_ENDPOINT);
