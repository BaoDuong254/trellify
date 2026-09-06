import {
  USER_FORGOT_PASSWORD_SCHEMA,
  USER_LOGIN_SCHEMA,
  USER_REGISTRATION_SCHEMA,
  USER_RESET_PASSWORD_SCHEMA,
  USER_UPDATE_SCHEMA,
  USER_VERIFICATION_SCHEMA,
} from "@workspace/shared/schemas/user.schema";

import { validateRequest } from "src/utils/validate-request";

export const userValidation = {
  createNew: validateRequest({ body: USER_REGISTRATION_SCHEMA }),
  verifyAccount: validateRequest({ body: USER_VERIFICATION_SCHEMA }),
  login: validateRequest({ body: USER_LOGIN_SCHEMA }),
  update: validateRequest({ body: USER_UPDATE_SCHEMA }),
  forgotPassword: validateRequest({ body: USER_FORGOT_PASSWORD_SCHEMA }),
  resetPassword: validateRequest({ body: USER_RESET_PASSWORD_SCHEMA }),
};
