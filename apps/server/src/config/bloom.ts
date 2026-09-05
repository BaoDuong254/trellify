import type { FindCursor, ObjectId } from "mongodb";

import logger from "@workspace/shared/utils/logger";

import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { BloomFilter, buildFilter, registerBloomRecovery } from "src/providers/bloom.provider";

type BloomPlan = {
  filter: BloomFilter;
  findAllIds: () => FindCursor<{ _id: ObjectId }>;
  countAll: () => Promise<number>;
};

const ERROR_RATE = 0.001;

export const BOARD_BLOOM: BloomFilter = {
  name: "board",
  key: "bf:v1:boards",
  capacity: 100_000,
  errorRate: ERROR_RATE,
};

export const COLUMN_BLOOM: BloomFilter = {
  name: "column",
  key: "bf:v1:columns",
  capacity: 200_000,
  errorRate: ERROR_RATE,
};

export const CARD_BLOOM: BloomFilter = {
  name: "card",
  key: "bf:v1:cards",
  capacity: 1_000_000,
  errorRate: ERROR_RATE,
};

const BLOOM_PLAN: BloomPlan[] = [
  { filter: BOARD_BLOOM, findAllIds: boardModel.findAllIds, countAll: boardModel.countAll },
  { filter: COLUMN_BLOOM, findAllIds: columnModel.findAllIds, countAll: columnModel.countAll },
  { filter: CARD_BLOOM, findAllIds: cardModel.findAllIds, countAll: cardModel.countAll },
];

const streamIds = (plan: BloomPlan) =>
  async function* (): AsyncGenerator<string> {
    for await (const document of plan.findAllIds()) {
      yield String(document._id);
    }
  };

const buildOne = async (plan: BloomPlan): Promise<void> => {
  try {
    await buildFilter(plan.filter, streamIds(plan), plan.countAll);
  } catch (error) {
    logger.error(`Bloom filter ${plan.filter.name} could not be ensured: ${(error as Error).message}`);
  }
};

export const ENSURE_BLOOM_FILTERS = async (): Promise<void> => {
  for (const plan of BLOOM_PLAN) await buildOne(plan);
};

export const REGISTER_BLOOM_RECOVERY = (): void => {
  registerBloomRecovery(ENSURE_BLOOM_FILTERS);
};
