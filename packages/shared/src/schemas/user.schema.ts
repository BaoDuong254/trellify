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
  verifyToken: z.string({ error: "Error.VerifyTokenMustBeString" }).nullable().default(null),
  createdAt: z.date({ error: "Error.CreatedAtMustBeDate" }).default(new Date()),
  updatedAt: z.date({ error: "Error.UpdatedAtMustBeDate" }).nullable().default(null),
  _destroy: z.boolean({ error: "Error._destroyMustBeBoolean" }).default(false),
});

export const USER_REGISTRATION_SCHEMA = USER_COLLECTION_SCHEMA.pick({ email: true, password: true });
export const USER_LOGIN_SCHEMA = USER_REGISTRATION_SCHEMA;
export const USER_REGISTRATION_SERVICE_SCHEMA = USER_COLLECTION_SCHEMA.pick({
  email: true,
  password: true,
  username: true,
  displayName: true,
  verifyToken: true,
});
export const USER_VERIFICATION_SCHEMA = USER_COLLECTION_SCHEMA.pick({ email: true }).extend({
  token: z.string({ error: "Error.VerifyTokenMustBeString" }),
});
export const USER_UPDATE_SCHEMA = USER_COLLECTION_SCHEMA.extend({
  current_password: z
    .string({ error: "Error.CurrentPasswordMustBeString" })
    .regex(PASSWORD_RULE, { error: `current_password: ${PASSWORD_RULE_MESSAGE}` }),
  new_password: z
    .string({ error: "Error.NewPasswordMustBeString" })
    .regex(PASSWORD_RULE, { error: `new_password: ${PASSWORD_RULE_MESSAGE}` }),
}).partial();

export type UserCollectionType = z.infer<typeof USER_COLLECTION_SCHEMA>;
export type UserRegistrationType = z.infer<typeof USER_REGISTRATION_SCHEMA>;
export type UserRegistrationServiceType = z.infer<typeof USER_REGISTRATION_SERVICE_SCHEMA>;
export type UserLoginType = z.infer<typeof USER_LOGIN_SCHEMA>;
export type UserVerificationType = z.infer<typeof USER_VERIFICATION_SCHEMA>;
export type UserUpdateType = z.infer<typeof USER_UPDATE_SCHEMA>;
