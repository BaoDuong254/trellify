import { CreateNewColumnType, UpdateColumnType } from "@workspace/shared/schemas/column.schema";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import ApiError from "src/utils/api-error";

const createNew = async (requestBody: CreateNewColumnType) => {
  const newColumn = {
    ...requestBody,
  };
  const createdColumn = await columnModel.createNew(newColumn);
  const getNewlyCreatedColumn = await columnModel.fineOneById(createdColumn.insertedId);
  if (getNewlyCreatedColumn) {
    getNewlyCreatedColumn.cards = [];
    await boardModel.pushColumnOrderIds(getNewlyCreatedColumn);
  }
  return getNewlyCreatedColumn;
};

const update = async (columnId: string, requestBody: UpdateColumnType) => {
  const updateData = { ...requestBody, updatedAt: new Date() };
  const updatedColumn = await columnModel.update(columnId, updateData);
  return updatedColumn;
};

const deleteItem = async (columnId: string) => {
  const targetColumn = await columnModel.fineOneById(new ObjectId(columnId));

  if (!targetColumn) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Column not found!");
  }

  await columnModel.deleteOneById(columnId);

  await cardModel.deleteManyByColumnId(columnId);

  await boardModel.pullColumnOrderIds(targetColumn);

  return { deleteResult: "Column and associated cards deleted successfully" };
};

export const columnService = {
  createNew,
  update,
  deleteItem,
};
