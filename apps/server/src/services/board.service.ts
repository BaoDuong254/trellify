import { StatusCodes } from "http-status-codes";
import { cloneDeep } from "lodash";
import { Document, ObjectId } from "mongodb";

import {
  CreateNewBoardType,
  MoveCardToDifferentColumnType,
  UpdateBoardType,
} from "@workspace/shared/schemas/board.schema";
import { BOARD_TYPES, DEFAULT_ITEMS_PER_PAGE, DEFAULT_PAGE } from "@workspace/shared/utils/constants";

import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { invitationModel } from "src/models/invitation.model";
import ApiError from "src/utils/api-error";
import slugify from "src/utils/formatters";

const createNew = async (userId: string, requestBody: CreateNewBoardType) => {
  const newBoard = {
    ...requestBody,
    slug: slugify(requestBody.title),
  };
  const createdBoard = await boardModel.createNew(userId, newBoard);
  const newlyCreatedBoard = await boardModel.findOneById(createdBoard.insertedId);
  return newlyCreatedBoard;
};

const groupCardsIntoColumns = (boardDetails: Document) => {
  const resultBoard = cloneDeep(boardDetails);
  for (const column of resultBoard.columns) {
    column.cards = resultBoard.cards.filter((card) => card.columnId.equals(column._id));
  }
  delete resultBoard.cards;
  return resultBoard;
};

const getDetails = async (userId: string, boardId: string) => {
  const boardDetails = await boardModel.getDetails(userId, boardId);
  if (!boardDetails) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Error.BoardNotFound");
  }
  return groupCardsIntoColumns(boardDetails);
};

const IS_PUBLIC_BOARD_READ_ALLOWED = false;

const canUserAccessBoard = async (userId: string, boardId: string): Promise<boolean> => {
  const board = await boardModel.findMembership(boardId);
  if (!board) return false;
  if (IS_PUBLIC_BOARD_READ_ALLOWED && board.type === BOARD_TYPES.PUBLIC) return true;

  const allowedIds: ObjectId[] = [...board.ownerIds, ...board.memberIds];
  return allowedIds.some((id) => id.toString() === userId);
};

const assertBoardAccess = async (userId: string, boardId: string): Promise<void> => {
  if (!(await canUserAccessBoard(userId, boardId))) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Error.BoardAccessDenied");
  }
};

const isBoardOwner = async (userId: string, boardId: string): Promise<boolean> => {
  const board = await boardModel.findMembership(boardId);
  if (!board) return false;

  const ownerIds: ObjectId[] = [...board.ownerIds];
  return ownerIds.some((id) => id.toString() === userId);
};

const assertBoardOwner = async (userId: string, boardId: string): Promise<void> => {
  if (!(await isBoardOwner(userId, boardId))) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Error.BoardOwnerOnly");
  }
};

const removeMember = async (
  actorId: string,
  boardId: string,
  targetUserId: string
): Promise<{ removeResult: string }> => {
  const board = await boardModel.findMembership(boardId);
  if (!board) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Error.BoardNotFound");
  }

  const ownerIds: ObjectId[] = [...board.ownerIds];
  if (ownerIds.some((id) => id.toString() === targetUserId)) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Error.CannotRemoveBoardOwner");
  }

  const memberIds: ObjectId[] = [...board.memberIds];
  if (memberIds.every((id) => id.toString() !== targetUserId)) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Error.UserIsNotBoardMember");
  }

  const isSelfRemoval = actorId === targetUserId;
  if (!isSelfRemoval) {
    await assertBoardOwner(actorId, boardId);
  }

  await boardModel.pullMemberIds(boardId, targetUserId);
  await cardModel.pullMemberFromBoardCards(boardId, targetUserId);
  await invitationModel.revokeBoardInvitations(boardId, targetUserId);

  return { removeResult: "Member removed from board successfully" };
};

const getBoardSnapshot = async (boardId: string) => {
  const boardDetails = await boardModel.getDetailsById(boardId);
  if (!boardDetails) return null;
  return groupCardsIntoColumns(boardDetails);
};

const update = async (userId: string, boardId: string, requestBody: UpdateBoardType) => {
  await assertBoardAccess(userId, boardId);

  const updateData = { ...requestBody, updatedAt: new Date() };
  const updatedBoard = await boardModel.update(boardId, updateData);
  return updatedBoard;
};

const moveCardToDifferentColumn = async (userId: string, requestBody: MoveCardToDifferentColumnType) => {
  const [previousColumn, nextColumn, card] = await Promise.all([
    columnModel.findOneById(new ObjectId(requestBody.prevColumnId)),
    columnModel.findOneById(new ObjectId(requestBody.nextColumnId)),
    cardModel.findOneById(new ObjectId(requestBody.currentCardId)),
  ]);

  if (!previousColumn || !nextColumn || !card) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Error.BoardNotFound");
  }

  // Both columns and the card have to live on the same board, otherwise a member
  // of one board could drag a card out of a board they have no access to.
  const boardId = String(previousColumn.boardId);
  if (String(nextColumn.boardId) !== boardId || String(card.boardId) !== boardId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Error.BoardAccessDenied");
  }

  await assertBoardAccess(userId, boardId);

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

  return { updateResult: "Successfully!", boardId };
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
    Math.trunc(Number(page)),
    Math.trunc(Number(itemsPerPage)),
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
  canUserAccessBoard,
  assertBoardAccess,
  isBoardOwner,
  assertBoardOwner,
  removeMember,
  getBoardSnapshot,
};
