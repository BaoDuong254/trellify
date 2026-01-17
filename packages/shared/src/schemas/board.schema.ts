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
  columnOrderIds: z
    .array(z.string({ error: "Error.ColumnIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }))
    .default([]),
  createdAt: z.date({ error: "Error.CreatedAtMustBeDate" }).default(new Date()),
  updatedAt: z.date({ error: "Error.UpdatedAtMustBeDate" }).nullable().default(null),
  _destroy: z.boolean({ error: "Error._destroyMustBeBoolean" }).default(false),
});

export const CREATE_NEW_BOARD_SCHEMA = BOARD_COLLECTION_SCHEMA.pick({
  title: true,
  description: true,
});

export type BoardCollectionType = z.infer<typeof BOARD_COLLECTION_SCHEMA>;
export type CreateNewBoardType = z.infer<typeof CREATE_NEW_BOARD_SCHEMA>;
