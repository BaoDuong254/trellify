import type { BoardCollectionType } from "@workspace/shared/schemas/board.schema";
import type { User } from "src/types/user.type";

export interface Card {
  _id: string;
  boardId: string;
  columnId: string;
  title?: string;
  description?: string | null;
  cover?: string | null;
  memberIds?: string[];
  comments?: string[];
  attachments?: string[];
  FE_PlaceholderCard?: boolean;
}

export interface Column {
  _id: string;
  boardId: string;
  title: string;
  cardOrderIds: string[];
  cards: Card[];
}

export interface Board extends BoardCollectionType {
  _id: string;
  type: BoardType;
  ownerIds: string[];
  memberIds: string[];
  columns: Column[];
  FE_allUsers: Omit<User, "password" | "verifyToken">[];
  owners: Omit<User, "password" | "verifyToken">[];
  members: Omit<User, "password" | "verifyToken">[];
}

export type BoardType = "public" | "private";
