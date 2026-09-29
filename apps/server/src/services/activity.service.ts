import { isEqual } from "lodash";
import { Document, WithId } from "mongodb";

import { CARD_ACTIVITY_TYPES, CardActivityType } from "@workspace/shared/schemas/activity.schema";
import { UpdateCardType } from "@workspace/shared/schemas/card.schema";
import { CARD_MEMBER_ACTIONS } from "@workspace/shared/utils/constants";
import logger from "@workspace/shared/utils/logger";

import { activityModel } from "src/models/activity.model";

type CardChange = { type: CardActivityType; data?: Record<string, unknown> };

const describeCardChanges = (card: Document, body: UpdateCardType, hasCoverChanged = false): CardChange[] => {
  const changes: CardChange[] = [];
  if (hasCoverChanged) changes.push({ type: CARD_ACTIVITY_TYPES.COVER_CHANGED });

  if (body.archived !== undefined && body.archived !== Boolean(card.archivedAt)) {
    changes.push({ type: body.archived ? CARD_ACTIVITY_TYPES.ARCHIVED : CARD_ACTIVITY_TYPES.RESTORED });
  }

  if (body.incomingMemberInfo) {
    const { action, userId } = body.incomingMemberInfo;
    const type =
      action === CARD_MEMBER_ACTIONS.ADD ? CARD_ACTIVITY_TYPES.MEMBER_ADDED : CARD_ACTIVITY_TYPES.MEMBER_REMOVED;
    changes.push({ type, data: { userId } });
  }

  if (body.title !== undefined && body.title !== card.title) {
    changes.push({ type: CARD_ACTIVITY_TYPES.TITLE_CHANGED, data: { from: card.title, to: body.title } });
  }
  if (body.description !== undefined && body.description !== card.description) {
    changes.push({ type: CARD_ACTIVITY_TYPES.DESCRIPTION_CHANGED });
  }

  const previousDue = card.dueDate instanceof Date ? card.dueDate.getTime() : null;
  if (previousDue !== null && body.dueDate === null) {
    changes.push({ type: CARD_ACTIVITY_TYPES.DUE_DATE_REMOVED });
  } else if (body.dueDate && body.dueDate.getTime() !== previousDue) {
    changes.push({ type: CARD_ACTIVITY_TYPES.DUE_DATE_SET, data: { dueDate: body.dueDate } });
  }
  if (body.dueComplete === true && !card.dueComplete) {
    changes.push({ type: CARD_ACTIVITY_TYPES.DUE_COMPLETED });
  }

  if (body.labelIds !== undefined && !isEqual(body.labelIds, card.labelIds ?? [])) {
    changes.push({ type: CARD_ACTIVITY_TYPES.LABELS_CHANGED });
  }
  if (body.checklist !== undefined && !isEqual(body.checklist, card.checklist ?? [])) {
    const done = body.checklist.filter((item) => item.done).length;
    changes.push({ type: CARD_ACTIVITY_TYPES.CHECKLIST_CHANGED, data: { done, total: body.checklist.length } });
  }

  return changes;
};

const record = async (card: WithId<Document>, actorId: string, changes: CardChange[]): Promise<void> => {
  if (changes.length === 0) return;
  try {
    await activityModel.createMany(
      changes.map((change) => ({
        boardId: String(card.boardId),
        cardId: String(card._id),
        actorId,
        type: change.type,
        data: change.data,
      }))
    );
  } catch (error) {
    logger.warn(`Card activity not recorded for ${String(card._id)}: ${(error as Error).message}`);
  }
};

const getByCard = async (cardId: string): Promise<Document[]> => activityModel.findByCard(cardId);

export const activityService = {
  describeCardChanges,
  record,
  getByCard,
};
