import { ObjectId } from "mongodb";

import { CARD_ACTIVITY_COLLECTION_SCHEMA, NewCardActivityType } from "@workspace/shared/schemas/activity.schema";

import { GET_DB } from "src/config/database";
import { userModel } from "src/models/user.model";

const ACTIVITY_COLLECTION_NAME = "activities";

const ACTIVITY_PAGE_SIZE = 50;

const createMany = async (entries: NewCardActivityType[]) => {
  const validEntries = await Promise.all(entries.map((entry) => CARD_ACTIVITY_COLLECTION_SCHEMA.parseAsync(entry)));
  return await GET_DB()
    .collection(ACTIVITY_COLLECTION_NAME)
    .insertMany(
      validEntries.map((entry) => ({
        ...entry,
        boardId: new ObjectId(entry.boardId),
        cardId: new ObjectId(entry.cardId),
        actorId: new ObjectId(entry.actorId),
      })),
      { ordered: false }
    );
};

const findByCard = async (cardId: string) => {
  return await GET_DB()
    .collection(ACTIVITY_COLLECTION_NAME)
    .aggregate([
      { $match: { cardId: new ObjectId(cardId), _destroy: false } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: ACTIVITY_PAGE_SIZE },
      {
        $lookup: {
          from: userModel.USER_COLLECTION_NAME,
          localField: "actorId",
          foreignField: "_id",
          as: "actor",
          pipeline: [{ $project: { _id: 0, displayName: 1, avatar: 1 } }],
        },
      },
      { $set: { actor: { $ifNull: [{ $first: "$actor" }, null] } } },
      { $project: { boardId: 0, cardId: 0, _destroy: 0 } },
    ])
    .toArray();
};

export const activityModel = {
  ACTIVITY_COLLECTION_NAME,
  createMany,
  findByCard,
};
