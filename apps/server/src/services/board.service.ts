import { cloneDeep } from "lodash";
import {
  CreateNewBoardType,
  MoveCardToDifferentColumnType,
  UpdateBoardType,
} from "@workspace/shared/schemas/board.schema";
import { StatusCodes } from "http-status-codes";
import { boardModel } from "src/models/board.model";
import ApiError from "src/utils/api-error";
import slugify from "src/utils/formatters";
import { columnModel } from "src/models/column.model";
import { cardModel } from "src/models/card.model";
import { DEFAULT_ITEMS_PER_PAGE, DEFAULT_PAGE } from "@workspace/shared/utils/constants";

const createNew = async (userId: string, requestBody: CreateNewBoardType) => {
  const newBoard = {
    ...requestBody,
    slug: slugify(requestBody.title),
  };
  const createdBoard = await boardModel.createNew(userId, newBoard);
  const getNewlyCreatedBoard = await boardModel.findOneById(createdBoard.insertedId);
  return getNewlyCreatedBoard;
};

const getDetails = async (userId: string, boardId: string) => {
  const boardDetails = await boardModel.getDetails(userId, boardId);
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

const update = async (boardId: string, requestBody: UpdateBoardType) => {
  const updateData = { ...requestBody, updatedAt: new Date() };
  const updatedBoard = await boardModel.update(boardId, updateData);
  return updatedBoard;
};

const moveCardToDifferentColumn = async (requestBody: MoveCardToDifferentColumnType) => {
  await columnModel.update(requestBody.prevColumnId, {
    cardOrderIds: requestBody.prevCardOrderIds,
    updatedAt: new Date(),
  });

  await columnModel.update(requestBody.nextColumnId, {
    cardOrderIds: requestBody.nextCardOrderIds,
    updatedAt: new Date(),
  });

  await cardModel.update(requestBody.currentCardId, {
    columnId: requestBody.nextColumnId,
  });

  return { updateResult: "Successfully!" };
};

const getBoards = async (
  userId: string,
  page?: string,
  itemsPerPage?: string,
  queryFilters?: Record<string, string>
) => {
  if (!page) page = DEFAULT_PAGE.toString();
  if (!itemsPerPage) itemsPerPage = DEFAULT_ITEMS_PER_PAGE.toString();

  const boards = await boardModel.getBoards(
    userId,
    Number.parseInt(page, 10),
    Number.parseInt(itemsPerPage, 10),
    queryFilters
  );
  return boards;
};

export const boardService = {
  createNew,
  getDetails,
  update,
  moveCardToDifferentColumn,
  getBoards,
};
