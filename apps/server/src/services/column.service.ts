import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";

import { CreateNewColumnType, UpdateColumnType } from "@workspace/shared/schemas/column.schema";

import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import ApiError from "src/utils/api-error";

const createNew = async (requestBody: CreateNewColumnType) => {
  const newColumn = {
    ...requestBody,
  };
  const createdColumn = await columnModel.createNew(newColumn);
  const newlyCreatedColumn = await columnModel.findOneById(createdColumn.insertedId);
  if (newlyCreatedColumn) {
    newlyCreatedColumn.cards = [];
    await boardModel.pushColumnOrderIds(newlyCreatedColumn);
  }
  return newlyCreatedColumn;
};

const update = async (columnId: string, requestBody: UpdateColumnType) => {
  const updateData = { ...requestBody, updatedAt: new Date() };
  const updatedColumn = await columnModel.update(columnId, updateData);
  return updatedColumn;
};

const deleteItem = async (columnId: string) => {
  const targetColumn = await columnModel.findOneById(new ObjectId(columnId));

  if (!targetColumn) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Column not found!");
  }

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
