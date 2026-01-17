import { CreateNewBoardType } from "@workspace/shared/schemas/board.schema";
import { boardModel } from "src/models/board.model";
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

export const boardService = {
  createNew,
};
