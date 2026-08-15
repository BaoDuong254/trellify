import { cloneDeep, isEmpty } from "lodash";

import type { Board } from "src/types/board.type";
import { generatePlaceholderCard } from "src/utils/formatters";
import { mapOrder } from "src/utils/sort";

export const normalizeBoard = (incomingBoard: Board): Board => {
  const board = cloneDeep(incomingBoard);

  board.FE_allUsers = (board.owners ?? []).concat(board.members ?? []);
  board.columns = mapOrder(board.columns, board.columnOrderIds, "_id");

  board.columns.forEach((column) => {
    if (isEmpty(column.cards)) {
      const placeholderCard = generatePlaceholderCard(column);
      column.cards = [placeholderCard];
      column.cardOrderIds = [placeholderCard._id];
    } else {
      column.cards = mapOrder(column.cards, column.cardOrderIds, "_id");
    }
  });

  return board;
};
