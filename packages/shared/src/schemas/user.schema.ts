import {
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
} from "@workspace/shared/utils/validators";
import { z } from "zod";

export const USER_ROLES = {
  CLIENT: "client",
  ADMIN: "admin",
};

export const USER_COLLECTION_SCHEMA = z.object({
  email: z.email({ error: "Error.EmailIsInvalid" }).regex(EMAIL_RULE, { error: EMAIL_RULE_MESSAGE }),
  password: z.string({ error: "Error.PasswordMustBeString" }).regex(PASSWORD_RULE, { error: PASSWORD_RULE_MESSAGE }),
  username: z.string({ error: "Error.UsernameMustBeString" }).trim(),
  displayName: z.string({ error: "Error.DisplayNameMustBeString" }).trim(),
  avatar: z.string({ error: "Error.AvatarMustBeString" }).nullable().default(null),
  role: z
    .enum([USER_ROLES.CLIENT, USER_ROLES.ADMIN], { error: "Error.RoleMustBeClientOrAdmin" })
    .default(USER_ROLES.CLIENT),
  isActive: z.boolean({ error: "Error.IsActiveMustBeBoolean" }).default(false),
  verifyToken: z.string({ error: "Error.VerifyTokenMustBeString" }),
  createdAt: z.date({ error: "Error.CreatedAtMustBeDate" }).default(new Date()),
  updatedAt: z.date({ error: "Error.UpdatedAtMustBeDate" }).nullable().default(null),
  _destroy: z.boolean({ error: "Error._destroyMustBeBoolean" }).default(false),
});

export const USER_REGISTRATION_SCHEMA = USER_COLLECTION_SCHEMA.pick({ email: true, password: true });
export const USER_REGISTRATION_SERVICE_SCHEMA = USER_COLLECTION_SCHEMA.pick({
  email: true,
  password: true,
  username: true,
  displayName: true,
  verifyToken: true,
});

export type UserCollectionType = z.infer<typeof USER_COLLECTION_SCHEMA>;
export type UserRegistrationType = z.infer<typeof USER_REGISTRATION_SCHEMA>;
export type UserRegistrationServiceType = z.infer<typeof USER_REGISTRATION_SERVICE_SCHEMA>;
