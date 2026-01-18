import type { Column } from "src/types/board.type";

/**
 * Capitalize the first letter of a string
 * @param val - input string
 * @returns string with first letter capitalized
 * @example
 * capitalizeFirstLetter("hello") // "Hello"
 */
export const capitalizeFirstLetter = (val?: string) => {
  if (!val) return "";
  return `${val.charAt(0).toUpperCase()}${val.slice(1)}`;
};

/**
 * Generate a placeholder card for a column
 * @param column - the column to generate the placeholder card for
 * @returns placeholder card object
 * @example
 * ```ts
 * generatePlaceholderCard(column) // Returns: { _id: "columnId-placeholder-card", boardId: "boardId", columnId: "columnId", FE_PlaceholderCard: true }
 * ```
 */
export const generatePlaceholderCard = (column: Column) => {
  return {
    _id: `${column._id}-placeholder-card`,
    boardId: column.boardId,
    columnId: column._id,
    FE_PlaceholderCard: true,
  };
};
