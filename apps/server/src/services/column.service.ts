import { StatusCodes } from "http-status-codes";
import { Document, ObjectId, WithId } from "mongodb";

import { CreateNewColumnType, UpdateColumnType } from "@workspace/shared/schemas/column.schema";

import { COLUMN_BLOOM } from "src/config/bloom";
import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { addItem, isPossiblyPresent } from "src/providers/bloom.provider";
import { boardService } from "src/services/board.service";
import ApiError from "src/utils/api-error";
import { captureArchivedPosition, resolveRestorePosition } from "src/utils/order-position";

const assertColumnAccess = async (userId: string, columnId: string) => {
  if (!(await isPossiblyPresent(COLUMN_BLOOM, columnId))) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Column not found!");
  }

  const column = await columnModel.findOneById(new ObjectId(columnId));
  if (!column) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Column not found!");
  }
  await boardService.assertBoardAccess(userId, String(column.boardId));
  return column;
};

const createNew = async (userId: string, requestBody: CreateNewColumnType) => {
  await boardService.assertBoardAccess(userId, requestBody.boardId);

  const newColumn = {
    ...requestBody,
  };
  const createdColumn = await columnModel.createNew(newColumn);
  await addItem(COLUMN_BLOOM, String(createdColumn.insertedId));
  const newlyCreatedColumn = await columnModel.findOneById(createdColumn.insertedId);
  if (newlyCreatedColumn) {
    newlyCreatedColumn.cards = [];
    await boardModel.pushColumnOrderIds(newlyCreatedColumn);
  }
  return newlyCreatedColumn;
};

const setArchived = async (column: WithId<Document>, isArchived: boolean): Promise<WithId<Document> | null> => {
  if (isArchived === Boolean(column.archivedAt)) return column;

  const columnId = String(column._id);
  const board = await boardModel.findOneById(new ObjectId(String(column.boardId)));
  const columnOrderIds: unknown = board?.columnOrderIds;

  if (isArchived) {
    const updatedColumn = await columnModel.update(columnId, {
      archivedAt: new Date(),
      archivedPosition: captureArchivedPosition(columnOrderIds, column._id),
      updatedAt: new Date(),
    });
    await boardModel.pullColumnOrderIds(column);
    return updatedColumn;
  }

  const position = resolveRestorePosition(columnOrderIds, column.archivedPosition);
  const updatedColumn = await columnModel.update(columnId, {
    archivedAt: null,
    archivedPosition: null,
    updatedAt: new Date(),
  });
  await boardModel.insertColumnOrderId(String(column.boardId), columnId, position);
  return updatedColumn;
};

const update = async (userId: string, columnId: string, requestBody: UpdateColumnType) => {
  const column = await assertColumnAccess(userId, columnId);

  const { archived, ...fields } = requestBody;
  if (archived !== undefined) return await setArchived(column, archived);

  const updateData = { ...fields, updatedAt: new Date() };
  const updatedColumn = await columnModel.update(columnId, updateData);
  return updatedColumn;
};

const deleteItem = async (userId: string, columnId: string) => {
  const targetColumn = await assertColumnAccess(userId, columnId);

  await columnModel.deleteOneById(columnId);

  await cardModel.deleteManyByColumnId(columnId);

  await boardModel.pullColumnOrderIds(targetColumn);

  return {
    deleteResult: "Column and associated cards deleted successfully",
    boardId: targetColumn.boardId?.toString() as string | undefined,
  };
};

export const columnService = {
  createNew,
  update,
  deleteItem,
};
