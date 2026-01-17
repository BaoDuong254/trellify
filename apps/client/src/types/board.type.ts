import type { BoardCollectionType } from "@workspace/shared/schemas/board.schema";

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
}

export type BoardType = "public" | "private";
