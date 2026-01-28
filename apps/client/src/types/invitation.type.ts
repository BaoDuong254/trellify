import type { BoardCollectionType } from "@workspace/shared/schemas/board.schema";
import type { InvitationCollectionType } from "@workspace/shared/schemas/invitation.schema";
import type { User } from "src/types/user.type";

export interface Notifications extends InvitationCollectionType {
  _id: string;
  inviter: Omit<User, "password" | "verifyToken">;
  invitee: Omit<User, "password" | "verifyToken">;
  board: BoardCollectionType;
}
