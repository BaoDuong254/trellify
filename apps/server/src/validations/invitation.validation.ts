import { INVITATION_CREATE_SCHEMA, INVITATION_ID_PARAMS_SCHEMA } from "@workspace/shared/schemas/invitation.schema";

import { validateRequest } from "src/utils/validate-request";

export const invitationValidation = {
  createNewBoardInvitation: validateRequest({ body: INVITATION_CREATE_SCHEMA }),
  updateBoardInvitation: validateRequest({ params: INVITATION_ID_PARAMS_SCHEMA }),
};
