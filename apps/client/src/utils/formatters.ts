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

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const formatDateTime = (value?: number | string | Date | null): string => {
  if (value === undefined || value === null) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : DATE_TIME_FORMAT.format(date);
};

const CLOUDINARY_UPLOAD_SEGMENT = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/;

export const cloudinaryThumb = (url: string | null | undefined, size: number): string | undefined => {
  if (!url) return undefined;
  const pixels = size * 2;
  return url.replace(CLOUDINARY_UPLOAD_SEGMENT, `$1c_fill,g_face,w_${pixels},h_${pixels},f_auto,q_auto/`);
};

export const cloudinaryImage = (url: string, width: number): string =>
  url.replace(CLOUDINARY_UPLOAD_SEGMENT, `$1c_limit,w_${width * 2},f_auto,q_auto/`);
