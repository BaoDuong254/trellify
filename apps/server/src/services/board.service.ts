import { cloneDeep } from "lodash";
import { CreateNewBoardType } from "@workspace/shared/schemas/board.schema";
import { StatusCodes } from "http-status-codes";
import { boardModel } from "src/models/board.model";
import ApiError from "src/utils/api-error";
import slugify from "src/utils/formatters";

const createNew = async (requestBody: CreateNewBoardType) => {
  const newBoard = {
    ...requestBody,
    slug: slugify(requestBody.title),
  };
  const createdBoard = await boardModel.createNew(newBoard);
  const getNewlyCreatedBoard = await boardModel.fineOneById(createdBoard.insertedId);
  return getNewlyCreatedBoard;
};

const getDetails = async (boardId: string) => {
  const boardDetails = await boardModel.getDetails(boardId);
  if (!boardDetails) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Error.BoardNotFound");
  }
  const resultBoard = cloneDeep(boardDetails);
  for (const column of resultBoard.columns) {
    column.cards = resultBoard.cards.filter((card) => card.columnId.equals(column._id));
  }
  delete resultBoard.cards;
  return resultBoard;
};

export const boardService = {
  createNew,
  getDetails,
};
