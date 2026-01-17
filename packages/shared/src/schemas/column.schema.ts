import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "@workspace/shared/utils/validators";
import { z } from "zod";

export const COLUMN_COLLECTION_SCHEMA = z.object({
  boardId: z.string({ error: "Error.BoardIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  title: z
    .string({ error: "Error.TitleMustBeString" })
    .min(3, { error: "Error.TitleTooShort" })
    .max(50, { error: "Error.TitleTooLong" })
    .trim(),
  cardOrderIds: z
    .array(z.string({ error: "Error.CardIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }))
    .default([]),
  createdAt: z.date({ error: "Error.CreatedAtMustBeDate" }).default(new Date()),
  updatedAt: z.date({ error: "Error.UpdatedAtMustBeDate" }).optional(),
  _destroy: z.boolean({ error: "Error._destroyMustBeBoolean" }).default(false),
});

export type ColumnCollectionType = z.infer<typeof COLUMN_COLLECTION_SCHEMA>;
