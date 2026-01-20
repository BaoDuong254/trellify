import { CreateNewColumnType } from "@workspace/shared/schemas/column.schema";
import { columnModel } from "src/models/column.model";

const createNew = async (requestBody: CreateNewColumnType) => {
  const newColumn = {
    ...requestBody,
  };
  const createdColumn = await columnModel.createNew(newColumn);
  const getNewlyCreatedColumn = await columnModel.fineOneById(createdColumn.insertedId);
  return getNewlyCreatedColumn;
};

export const columnService = {
  createNew,
};
