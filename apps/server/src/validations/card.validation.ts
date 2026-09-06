import {
  CARD_ID_PARAMS_SCHEMA,
  CREATE_NEW_CARD_SCHEMA,
  UPDATE_CARD_SCHEMA,
} from "@workspace/shared/schemas/card.schema";

import { validateRequest } from "src/utils/validate-request";

export const cardValidation = {
  createNew: validateRequest({ body: CREATE_NEW_CARD_SCHEMA }),
  update: validateRequest({ params: CARD_ID_PARAMS_SCHEMA, body: UPDATE_CARD_SCHEMA }),
  deleteItem: validateRequest({ params: CARD_ID_PARAMS_SCHEMA }),
};
