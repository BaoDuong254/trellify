import { z } from "zod";

import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "@workspace/shared/utils/validators";

const NEIGHBOUR_ID = z.string().regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }).nullable();

export const ARCHIVED_POSITION_SCHEMA = z
  .object({
    prevId: NEIGHBOUR_ID,
    nextId: NEIGHBOUR_ID,
    index: z.number().int().min(0),
  })
  .nullable()
  .default(null);

export type ArchivedPositionType = z.infer<typeof ARCHIVED_POSITION_SCHEMA>;
