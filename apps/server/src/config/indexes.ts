import { CreateIndexesOptions, IndexSpecification } from "mongodb";

import logger from "@workspace/shared/utils/logger";

import { GET_DB } from "src/config/database";
import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { invitationModel } from "src/models/invitation.model";
import { userModel } from "src/models/user.model";
import { indexesReady } from "src/providers/metrics.provider";

interface IndexPlan {
  collection: string;
  spec: IndexSpecification;
  options?: CreateIndexesOptions;
}

const INDEX_PLAN: IndexPlan[] = [
  { collection: cardModel.CARD_COLLECTION_NAME, spec: { boardId: 1 } },
  { collection: cardModel.CARD_COLLECTION_NAME, spec: { columnId: 1 } },
  { collection: columnModel.COLUMN_COLLECTION_NAME, spec: { boardId: 1 } },
  { collection: boardModel.BOARD_COLLECTION_NAME, spec: { ownerIds: 1, _destroy: 1 } },
  { collection: boardModel.BOARD_COLLECTION_NAME, spec: { memberIds: 1, _destroy: 1 } },
  {
    collection: userModel.USER_COLLECTION_NAME,
    spec: { email: 1 },
    options: { unique: true, partialFilterExpression: { _destroy: false } },
  },
  {
    collection: userModel.USER_COLLECTION_NAME,
    spec: { verifyToken: 1 },
    options: { partialFilterExpression: { verifyToken: { $type: "string" } } },
  },
  { collection: invitationModel.INVITATION_COLLECTION_NAME, spec: { inviteeId: 1, _destroy: 1 } },
];

export const ENSURE_INDEXES = async (): Promise<void> => {
  const failures: string[] = [];

  for (const plan of INDEX_PLAN) {
    const name = `${plan.collection}.${JSON.stringify(plan.spec)}`;
    try {
      await GET_DB()
        .collection(plan.collection)
        .createIndex(plan.spec, plan.options ?? {});
    } catch (error) {
      failures.push(name);
      logger.error(`Failed to create index ${name}: ${(error as Error).message}`);
    }
  }

  indexesReady.set(failures.length === 0 ? 1 : 0);

  if (failures.length > 0) {
    logger.error(
      `${failures.length}/${INDEX_PLAN.length} indexes missing — queries will fall back to collection scans`
    );
    return;
  }
  logger.info(`All ${INDEX_PLAN.length} MongoDB indexes are in place`);
};
