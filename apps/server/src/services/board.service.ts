import { cloneDeep } from "lodash";
import { CreateNewBoardType } from "@workspace/shared/schemas/board.schema";
import { StatusCodes } from "http-status-codes";
import { boardModel } from "src/models/board.model";
import ApiError from "src/utils/api-error";
import slugify from "src/utils/formatters";

const createNew = async (requestBody: CreateNewBoardType) => {
  try {
    const newBoard = {
      ...requestBody,
      slug: slugify(requestBody.title),
    };
    const createdBoard = await boardModel.createNew(newBoard);
    const getNewlyCreatedBoard = await boardModel.fineOneById(createdBoard.insertedId);
    return getNewlyCreatedBoard;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

const getDetails = async (boardId: string) => {
  try {
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
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};

export const boardService = {
  createNew,
  getDetails,
};
