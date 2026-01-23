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

/**
 * Toggle loading state for elements with interceptor-loading class
 * @param calling - whether API call is in progress
 * @example
 * ```ts
 * interceptorLoadingElements(true) // Disable elements
 * interceptorLoadingElements(false) // Enable elements
 * ```
 */
export const interceptorLoadingElements = (calling: boolean): void => {
  const elements = document.querySelectorAll<HTMLElement>(".interceptor-loading");
  elements.forEach((element) => {
    if (calling) {
      element.style.opacity = "0.5";
      element.style.pointerEvents = "none";
    } else {
      element.style.opacity = "initial";
      element.style.pointerEvents = "initial";
    }
  });
};
