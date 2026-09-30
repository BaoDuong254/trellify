import type { BoardCollectionType } from "@workspace/shared/schemas/board.schema";
import type { CardCommentType, ChecklistItemType } from "@workspace/shared/schemas/card.schema";

import type { PublicUser } from "src/types/user.type";

export interface Card {
  _id: string;
  boardId: string;
  columnId: string;
  title?: string;
  description?: string | null;
  cover?: string | null;
  memberIds?: string[];
  commentCount?: number;
  updatedAt?: string | null;
  attachments?: string[];
  dueDate?: string | null;
  dueComplete?: boolean;
  labelIds?: string[];
  checklist?: ChecklistItemType[];
  FE_PlaceholderCard?: boolean;
}

export interface CardWithComments extends Card {
  comments?: CardCommentType[];
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
  ownerIds: string[];
  memberIds: string[];
  columns: Column[];
  FE_allUsers: PublicUser[];
  owners: PublicUser[];
  members: PublicUser[];
}

export interface BoardLink {
  _id: string;
  title: string;
}

export interface ArchivedItems {
  cards: { _id: string; title: string; columnId: string; archivedAt: string }[];
  columns: { _id: string; title: string; archivedAt: string }[];
}
