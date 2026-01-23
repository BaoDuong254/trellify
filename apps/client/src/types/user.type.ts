import type { UserCollectionType } from "@workspace/shared/schemas/user.schema";

export interface User extends UserCollectionType {
  _id: string;
}
