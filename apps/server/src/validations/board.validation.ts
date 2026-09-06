import {
  BOARD_ID_PARAMS_SCHEMA,
  CREATE_NEW_BOARD_SCHEMA,
  MOVE_CARD_TO_DIFFERENT_COLUMN_SCHEMA,
  REMOVE_BOARD_MEMBER_PARAMS_SCHEMA,
  UPDATE_BOARD_SCHEMA,
} from "@workspace/shared/schemas/board.schema";

import { validateRequest } from "src/utils/validate-request";

export const boardValidation = {
  createNew: validateRequest({ body: CREATE_NEW_BOARD_SCHEMA }),
  getDetails: validateRequest({ params: BOARD_ID_PARAMS_SCHEMA }),
  update: validateRequest({ params: BOARD_ID_PARAMS_SCHEMA, body: UPDATE_BOARD_SCHEMA }),
  moveCardToDifferentColumn: validateRequest({ body: MOVE_CARD_TO_DIFFERENT_COLUMN_SCHEMA }),
  removeMember: validateRequest({ params: REMOVE_BOARD_MEMBER_PARAMS_SCHEMA }),
};
