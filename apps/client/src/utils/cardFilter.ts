import type { Card } from "src/types/board.type";
import { type DueStatus, dueStatus } from "src/utils/formatters";

export type DueFilter = DueStatus | "none";

export interface CardFilter {
  keyword: string;
  labelIds: string[];
  memberIds: string[];
  due: DueFilter | null;
}

export const EMPTY_CARD_FILTER: CardFilter = { keyword: "", labelIds: [], memberIds: [], due: null };

export const countActiveFilters = (filter: CardFilter): number =>
  (filter.keyword.trim() ? 1 : 0) + filter.labelIds.length + filter.memberIds.length + (filter.due ? 1 : 0);

const matchesDue = (card: Card, due: DueFilter, now: number): boolean => {
  if (!card.dueDate) return due === "none";
  return due === dueStatus(card.dueDate, card.dueComplete, now);
};

export const matchesCardFilter = (card: Card, filter: CardFilter, now = Date.now()): boolean => {
  const keyword = filter.keyword.trim().toLowerCase();
  if (keyword && !card.title?.toLowerCase().includes(keyword)) return false;
  if (filter.labelIds.length && !filter.labelIds.some((id) => card.labelIds?.includes(id))) return false;
  if (filter.memberIds.length && !filter.memberIds.some((id) => card.memberIds?.includes(id))) return false;
  if (filter.due && !matchesDue(card, filter.due, now)) return false;
  return true;
};
