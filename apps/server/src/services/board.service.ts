import { StatusCodes } from "http-status-codes";
import { cloneDeep } from "lodash";
import { Document, ObjectId } from "mongodb";

import {
  CreateNewBoardType,
  MoveCardToDifferentColumnType,
  UpdateBoardType,
} from "@workspace/shared/schemas/board.schema";
import { BOARD_TYPES, DEFAULT_ITEMS_PER_PAGE, DEFAULT_PAGE } from "@workspace/shared/utils/constants";

import environmentConfig from "src/config/environment";
import { boardModel } from "src/models/board.model";
import { cardModel } from "src/models/card.model";
import { columnModel } from "src/models/column.model";
import { invitationModel } from "src/models/invitation.model";
import {
  BloomFilter,
  addItem,
  buildFilter,
  isPossiblyPresent,
  registerBloomRecovery,
} from "src/providers/bloom.provider";
import { getOrLoad, invalidate } from "src/providers/cache.provider";
import ApiError from "src/utils/api-error";
import slugify from "src/utils/formatters";

const BOARD_BLOOM: BloomFilter = {
  name: "board",
  key: "bf:v1:boards",
  capacity: 100_000,
  errorRate: 0.001,
};

const streamBoardIds = async function* (): AsyncGenerator<string> {
  for await (const board of boardModel.findAllIds()) {
    yield String(board._id);
  }
};

const ensureBoardBloomFilter = async (): Promise<void> => {
  await buildFilter(BOARD_BLOOM, streamBoardIds, boardModel.countAll);
};

const registerBoardBloomRecovery = (): void => {
  registerBloomRecovery(ensureBoardBloomFilter);
};

const createNew = async (userId: string, requestBody: CreateNewBoardType) => {
  const newBoard = {
    ...requestBody,
    slug: slugify(requestBody.title),
  };
  const createdBoard = await boardModel.createNew(userId, newBoard);
  await addItem(BOARD_BLOOM, String(createdBoard.insertedId));
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

const IS_PUBLIC_BOARD_READ_ALLOWED = false;

type BoardMembership = { ownerIds: unknown[]; memberIds: unknown[]; type?: string };

const membershipCacheKey = (boardId: string): string => `c:v1:board-membership:${boardId}`;

const invalidateBoardMembership = async (boardId: string): Promise<void> => {
  await invalidate(membershipCacheKey(boardId));
};

const getMembership = async (boardId: string): Promise<BoardMembership | null> => {
  if (!(await isPossiblyPresent(BOARD_BLOOM, boardId))) return null;

  return getOrLoad<BoardMembership>({
    cacheName: "board-membership",
    key: membershipCacheKey(boardId),
    ttlSeconds: environmentConfig.BOARD_MEMBERSHIP_CACHE_TTL_SECONDS,
    negativeTtlSeconds: environmentConfig.BOARD_MEMBERSHIP_CACHE_TTL_SECONDS,
    load: async (): Promise<BoardMembership | null> => {
      const board = await boardModel.findMembership(boardId);
      if (!board) return null;
      return { ownerIds: board.ownerIds, memberIds: board.memberIds, type: board.type };
    },
  });
};

const canUserAccessBoard = async (userId: string, boardId: string): Promise<boolean> => {
  const board = await getMembership(boardId);
  if (!board) return false;
  if (IS_PUBLIC_BOARD_READ_ALLOWED && board.type === BOARD_TYPES.PUBLIC) return true;

  return [...board.ownerIds, ...board.memberIds].some((id) => String(id) === userId);
};

const assertBoardAccess = async (userId: string, boardId: string): Promise<void> => {
  if (!(await canUserAccessBoard(userId, boardId))) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Error.BoardAccessDenied");
  }
};

const isBoardOwner = async (userId: string, boardId: string): Promise<boolean> => {
  const board = await getMembership(boardId);
  if (!board) return false;

  return board.ownerIds.some((id) => String(id) === userId);
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
  await invalidateBoardMembership(boardId);
  await cardModel.pullMemberFromBoardCards(boardId, targetUserId);
  await invitationModel.revokeBoardInvitations(boardId, targetUserId);

  return { removeResult: "Member removed from board successfully" };
};

const getBoardSnapshot = async (boardId: string) => {
  const boardDetails = await boardModel.getDetailsById(boardId);
  if (!boardDetails) return null;
  return groupCardsIntoColumns(boardDetails);
};

const boardCacheKey = (boardId: string): string => `c:v1:board:${boardId}`;

const invalidateBoardCache = async (boardId: string): Promise<void> => {
  await invalidate(boardCacheKey(boardId));
};

const getDetails = async (userId: string, boardId: string) => {
  if (!(await canUserAccessBoard(userId, boardId))) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Error.BoardNotFound");
  }

  const board = await getOrLoad<Document>({
    cacheName: "board",
    key: boardCacheKey(boardId),
    ttlSeconds: environmentConfig.BOARD_CACHE_TTL_SECONDS,
    negativeTtlSeconds: environmentConfig.BOARD_CACHE_NEGATIVE_TTL_SECONDS,
    load: () => getBoardSnapshot(boardId),
  });

  if (!board) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Error.BoardNotFound");
  }
  return board;
};

const update = async (userId: string, boardId: string, requestBody: UpdateBoardType) => {
  await assertBoardAccess(userId, boardId);

  const updateData = { ...requestBody, updatedAt: new Date() };
  const updatedBoard = await boardModel.update(boardId, updateData);
  await invalidateBoardMembership(boardId);
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
  invalidateBoardCache,
  invalidateBoardMembership,
  ensureBoardBloomFilter,
  registerBoardBloomRecovery,
};
