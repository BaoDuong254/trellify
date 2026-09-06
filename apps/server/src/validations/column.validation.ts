import {
  COLUMN_ID_PARAMS_SCHEMA,
  CREATE_NEW_COLUMN_SCHEMA,
  UPDATE_COLUMN_SCHEMA,
} from "@workspace/shared/schemas/column.schema";

import { validateRequest } from "src/utils/validate-request";

export const columnValidation = {
  createNew: validateRequest({ body: CREATE_NEW_COLUMN_SCHEMA }),
  update: validateRequest({ params: COLUMN_ID_PARAMS_SCHEMA, body: UPDATE_COLUMN_SCHEMA }),
  deleteItem: validateRequest({ params: COLUMN_ID_PARAMS_SCHEMA }),
};
