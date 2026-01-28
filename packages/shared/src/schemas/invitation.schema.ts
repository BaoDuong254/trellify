import { BOARD_INVITATION_STATUS, INVITATION_TYPES } from "@workspace/shared/utils/constants";
import {
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE,
} from "@workspace/shared/utils/validators";
import { z } from "zod";

export const INVITATION_COLLECTION_SCHEMA = z.object({
  inviterId: z
    .string({ error: "Error.InviterIdMustBeString" })
    .regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  inviteeId: z
    .string({ error: "Error.InviteeIdMustBeString" })
    .regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  type: z.enum(Object.values(INVITATION_TYPES), { error: "Error.TypeMustBeValid" }),
  boardInvitation: z
    .object({
      boardId: z
        .string({ error: "Error.BoardIdMustBeString" })
        .regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
      status: z.enum(Object.values(BOARD_INVITATION_STATUS), {
        error: "Error.StatusMustBeValid",
      }),
    })
    .optional(),
  createdAt: z.date({ error: "Error.CreatedAtMustBeDate" }).default(new Date()),
  updatedAt: z.date({ error: "Error.UpdatedAtMustBeDate" }).nullable().default(null),
  _destroy: z.boolean({ error: "Error._destroyMustBeBoolean" }).default(false),
});

export const INVITATION_CREATE_SCHEMA = z.object({
  inviteeEmail: z.email().regex(EMAIL_RULE, { error: EMAIL_RULE_MESSAGE }),
  boardId: z.string({ error: "Error.BoardIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
});

export const INVITATION_CREATE_SERVICE_SCHEMA = INVITATION_COLLECTION_SCHEMA.pick({
  inviterId: true,
  inviteeId: true,
  type: true,
  boardInvitation: true,
});

export const INVITATION_UPDATE_SCHEMA = INVITATION_COLLECTION_SCHEMA.partial();

export type InvitationCollectionType = z.infer<typeof INVITATION_COLLECTION_SCHEMA>;
export type InvitationCreateType = z.infer<typeof INVITATION_CREATE_SCHEMA>;
export type InvitationCreateServiceType = z.infer<typeof INVITATION_CREATE_SERVICE_SCHEMA>;
export type InvitationUpdateType = z.infer<typeof INVITATION_UPDATE_SCHEMA>;
