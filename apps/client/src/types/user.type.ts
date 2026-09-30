import type { UserCollectionType } from "@workspace/shared/schemas/user.schema";

export interface User extends Omit<UserCollectionType, "starredBoardIds"> {
  _id: string;
}

export type PublicUser = Omit<User, "password" | "verifyToken">;
