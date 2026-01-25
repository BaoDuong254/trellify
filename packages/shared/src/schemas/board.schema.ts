import { BOARD_TYPES } from "@workspace/shared/utils/constants";
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "@workspace/shared/utils/validators";
import { z } from "zod";

export const BOARD_COLLECTION_SCHEMA = z.object({
  title: z
    .string({ error: "Error.TitleMustBeString" })
    .min(3, { error: "Error.TitleTooShort" })
    .max(50, { error: "Error.TitleTooLong" })
    .trim(),
  slug: z.string({ error: "Error.SlugMustBeString" }).min(3, { error: "Error.SlugTooShort" }).trim(),
  description: z
    .string({ error: "Error.DescriptionMustBeString" })
    .min(3, { error: "Error.DescriptionTooShort" })
    .max(256, { error: "Error.DescriptionTooLong" })
    .trim(),
  type: z.enum([BOARD_TYPES.PRIVATE, BOARD_TYPES.PUBLIC], { error: "Error.TypeMustBePrivateOrPublic" }),
  columnOrderIds: z
    .array(z.string({ error: "Error.ColumnIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }))
    .default([]),
  ownerIds: z
    .array(z.string({ error: "Error.OwnerIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }))
    .default([]),
  memberIds: z
    .array(z.string({ error: "Error.MemberIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }))
    .default([]),
  createdAt: z.date({ error: "Error.CreatedAtMustBeDate" }).default(new Date()),
  updatedAt: z.date({ error: "Error.UpdatedAtMustBeDate" }).nullable().default(null),
  _destroy: z.boolean({ error: "Error._destroyMustBeBoolean" }).default(false),
});

export const CREATE_NEW_BOARD_SCHEMA = BOARD_COLLECTION_SCHEMA.pick({
  title: true,
  description: true,
  type: true,
});

export const UPDATE_BOARD_SCHEMA = BOARD_COLLECTION_SCHEMA.pick({
  title: true,
  description: true,
  type: true,
  columnOrderIds: true,
}).partial();

export const MOVE_CARD_TO_DIFFERENT_COLUMN_SCHEMA = z.object({
  currentCardId: z
    .string({ error: "Error.CurrentCardIdMustBeString" })
    .regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  prevColumnId: z
    .string({ error: "Error.PrevColumnIdMustBeString" })
    .regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  prevCardOrderIds: z
    .array(z.string({ error: "Error.CardIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }))
    .default([]),
  nextColumnId: z
    .string({ error: "Error.NextColumnIdMustBeString" })
    .regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  nextCardOrderIds: z
    .array(z.string({ error: "Error.CardIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }))
    .default([]),
});

export type BoardCollectionType = z.infer<typeof BOARD_COLLECTION_SCHEMA>;
export type CreateNewBoardType = z.infer<typeof CREATE_NEW_BOARD_SCHEMA>;
export type UpdateBoardType = z.infer<typeof UPDATE_BOARD_SCHEMA>;
export type MoveCardToDifferentColumnType = z.infer<typeof MOVE_CARD_TO_DIFFERENT_COLUMN_SCHEMA>;
