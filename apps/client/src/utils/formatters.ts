/**
 * Capitalize the first letter of a string
 * @param val - input string
 * @returns string with first letter capitalized
 * @example
 * capitalizeFirstLetter("hello") // "Hello"
 */
export const capitalizeFirstLetter = (val: string) => {
  if (!val) return "";
  return `${val.charAt(0).toUpperCase()}${val.slice(1)}`;
};
