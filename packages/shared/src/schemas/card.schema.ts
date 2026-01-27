import {
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE,
} from "@workspace/shared/utils/validators";
import { z } from "zod";

export const CARD_COLLECTION_SCHEMA = z.object({
  boardId: z.string({ error: "Error.BoardIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  columnId: z.string({ error: "Error.ColumnIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  title: z
    .string({ error: "Error.TitleMustBeString" })
    .min(3, { error: "Error.TitleTooShort" })
    .max(50, { error: "Error.TitleTooLong" })
    .trim(),
  description: z.string({ error: "Error.DescriptionMustBeString" }).optional(),
  cover: z.url({ message: "Error.CoverMustBeURL" }).nullable().default(null),
  memberIds: z
    .array(z.string({ error: "Error.MemberIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }))
    .default([]),
  comments: z
    .array(
      z.object({
        userId: z
          .string({ error: "Error.UserIdMustBeString" })
          .regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
        userEmail: z.email().regex(EMAIL_RULE, { error: EMAIL_RULE_MESSAGE }),
        userAvatar: z.url({ message: "Error.UserAvatarMustBeURL" }).nullable().default(null),
        userDisplayName: z.string({ error: "Error.UserDisplayNameMustBeString" }),
        content: z.string({ error: "Error.CommentContentMustBeString" }),
        commentedAt: z.date({ error: "Error.CommentedAtMustBeDate" }),
      })
    )
    .default([]),
  createdAt: z.date({ error: "Error.CreatedAtMustBeDate" }).default(new Date()),
  updatedAt: z.date({ error: "Error.UpdatedAtMustBeDate" }).nullable().default(null),
  _destroy: z.boolean({ error: "Error._destroyMustBeBoolean" }).default(false),
});

export const CREATE_NEW_CARD_SCHEMA = CARD_COLLECTION_SCHEMA.pick({
  title: true,
  boardId: true,
  columnId: true,
});

export const UPDATE_CARD_SCHEMA = CARD_COLLECTION_SCHEMA.partial();

export type CardCollectionType = z.infer<typeof CARD_COLLECTION_SCHEMA>;
export type CreateNewCardType = z.infer<typeof CREATE_NEW_CARD_SCHEMA>;
export type UpdateCardType = z.infer<typeof UPDATE_CARD_SCHEMA>;
