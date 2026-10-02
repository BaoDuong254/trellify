import { z } from "zod";

import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "@workspace/shared/utils/validators";

export const CARD_ACTIVITY_TYPES = {
  CARD_CREATED: "CARD_CREATED",
  CARD_MOVED: "CARD_MOVED",
  TITLE_CHANGED: "TITLE_CHANGED",
  DESCRIPTION_CHANGED: "DESCRIPTION_CHANGED",
  DUE_DATE_SET: "DUE_DATE_SET",
  DUE_DATE_REMOVED: "DUE_DATE_REMOVED",
  DUE_COMPLETED: "DUE_COMPLETED",
  LABELS_CHANGED: "LABELS_CHANGED",
  CHECKLIST_CHANGED: "CHECKLIST_CHANGED",
  MEMBER_ADDED: "MEMBER_ADDED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  COVER_CHANGED: "COVER_CHANGED",
  COVER_REMOVED: "COVER_REMOVED",
  ARCHIVED: "ARCHIVED",
  RESTORED: "RESTORED",
} as const;

const OBJECT_ID = z.string().regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE });

export const CARD_ACTIVITY_COLLECTION_SCHEMA = z.object({
  boardId: OBJECT_ID,
  cardId: OBJECT_ID,
  actorId: OBJECT_ID,
  type: z.enum(CARD_ACTIVITY_TYPES),
  data: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.date().default(() => new Date()),
  _destroy: z.boolean().default(false),
});

export type CardActivityType = (typeof CARD_ACTIVITY_TYPES)[keyof typeof CARD_ACTIVITY_TYPES];
export type NewCardActivityType = z.input<typeof CARD_ACTIVITY_COLLECTION_SCHEMA>;

export interface CardActivityEntryType {
  _id: string;
  actorId: string;
  type: CardActivityType;
  data: Record<string, unknown>;
  createdAt: string;
  actor: { displayName: string; avatar: string | null } | null;
}
