import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "@workspace/shared/utils/validators";
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
  createdAt: z.date({ error: "Error.CreatedAtMustBeDate" }).default(new Date()),
  updatedAt: z.date({ error: "Error.UpdatedAtMustBeDate" }).nullable().default(null),
  _destroy: z.boolean({ error: "Error._destroyMustBeBoolean" }).default(false),
});

export type CardCollectionType = z.infer<typeof CARD_COLLECTION_SCHEMA>;
