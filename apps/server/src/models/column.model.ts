import { Document, FindCursor, ObjectId, UpdateFilter } from "mongodb";

import {
  COLUMN_COLLECTION_SCHEMA,
  ColumnPatchType,
  CreateNewColumnType,
} from "@workspace/shared/schemas/column.schema";

import { GET_DB } from "src/config/database";

const COLUMN_COLLECTION_NAME = "columns";

const validateBeforeCreate = async (data: unknown) => {
  return await COLUMN_COLLECTION_SCHEMA.parseAsync(data);
};

const INVALID_UPDATE_FIELDS = new Set(["_id", "createdAt", "boardId"]);

const createNew = async (data: CreateNewColumnType) => {
  const validData = await validateBeforeCreate(data);
  const newColumnToAdd = {
    ...validData,
    boardId: new ObjectId(validData.boardId),
  };
  const createdColumn = await GET_DB().collection(COLUMN_COLLECTION_NAME).insertOne(newColumnToAdd);
  return createdColumn;
};

const findAllIds = (): FindCursor<{ _id: ObjectId }> =>
  GET_DB()
    .collection(COLUMN_COLLECTION_NAME)
    .find({}, { projection: { _id: 1 } }) as unknown as FindCursor<{ _id: ObjectId }>;

const countAll = async (): Promise<number> => GET_DB().collection(COLUMN_COLLECTION_NAME).countDocuments({});

const findOneById = async (id: ObjectId) => {
  const column = await GET_DB().collection(COLUMN_COLLECTION_NAME).findOne({ _id: id, _destroy: false });
  return column;
};

const findArchivedByBoard = async (boardId: string) => {
  return await GET_DB()
    .collection(COLUMN_COLLECTION_NAME)
    .find(
      { boardId: new ObjectId(boardId), _destroy: false, archivedAt: { $type: "date" } },
      { projection: { title: 1, archivedAt: 1 } }
    )
    .sort({ archivedAt: -1 })
    .limit(100)
    .toArray();
};

const insertCardOrderId = async (parentId: string, childId: string, position: number | null) => {
  const child = new ObjectId(childId);
  return await GET_DB()
    .collection(COLUMN_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(parentId), _destroy: false, cardOrderIds: { $ne: child } },
      {
        $push: { cardOrderIds: { $each: [child], ...(position !== null && { $position: position }) } },
      } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
};

const pushCardOrderIds = async (card) => {
  return await GET_DB()
    .collection(COLUMN_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(card.columnId as string), _destroy: false },
      { $addToSet: { cardOrderIds: new ObjectId(card._id as string) } } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
};

const update = async (columnId: string, updateData: ColumnPatchType) => {
  for (const field of Object.keys(updateData)) {
    if (INVALID_UPDATE_FIELDS.has(field)) {
      delete updateData[field];
    }
  }
  if (updateData.cardOrderIds) {
    updateData.cardOrderIds = updateData.cardOrderIds.map((_id) => new ObjectId(_id)) as unknown as string[];
  }
  return await GET_DB()
    .collection(COLUMN_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(columnId), _destroy: false },
      { $set: updateData },
      { returnDocument: "after" }
    );
};

const deleteOneById = async (columnId: string) => {
  const result = await GET_DB()
    .collection(COLUMN_COLLECTION_NAME)
    .updateOne({ _id: new ObjectId(columnId) }, { $set: { _destroy: true, updatedAt: new Date() } });
  return result;
};

const pullCardOrderIds = async (card) => {
  const result = await GET_DB()
    .collection(COLUMN_COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(card.columnId as string), _destroy: false },
      { $pull: { cardOrderIds: new ObjectId(card._id as string) } } as unknown as UpdateFilter<Document>,
      { returnDocument: "after" }
    );
  return result;
};

export const columnModel = {
  COLUMN_COLLECTION_NAME,
  createNew,
  findAllIds,
  countAll,
  findOneById,
  findArchivedByBoard,
  insertCardOrderId,
  pushCardOrderIds,
  update,
  deleteOneById,
  pullCardOrderIds,
};
