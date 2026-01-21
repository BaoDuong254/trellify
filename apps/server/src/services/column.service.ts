import { CreateNewColumnType, UpdateColumnType } from "@workspace/shared/schemas/column.schema";
import { boardModel } from "src/models/board.model";
import { columnModel } from "src/models/column.model";

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

export const columnService = {
  createNew,
  update,
};
