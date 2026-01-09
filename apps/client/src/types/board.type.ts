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

export interface Board {
  _id: string;
  title: string;
  description: string;
  type: BoardType;
  ownerIds: string[];
  memberIds: string[];
  columnOrderIds: string[];
  columns: Column[];
}

export type BoardType = "public" | "private";
