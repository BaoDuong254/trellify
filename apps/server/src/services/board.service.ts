import { CreateNewBoardType } from "@workspace/shared/schemas/board.schema";
import slugify from "src/utils/formatters";

const createNew = async (requestBody: CreateNewBoardType) => {
  const newBoard = {
    ...requestBody,
    slug: slugify(requestBody.title),
  };
  return newBoard;
};

export const boardService = {
  createNew,
};
