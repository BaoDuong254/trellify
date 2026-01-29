import { Socket } from "socket.io";

export const inviteUserToBoardSocket = (socket: Socket) => {
  socket.on("FE_USER_INVITED_TO_BOARD", (invitation: unknown) => {
    socket.broadcast.emit("BE_USER_INVITED_TO_BOARD", invitation);
  });
};
