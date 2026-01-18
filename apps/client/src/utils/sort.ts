/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Map and sort an array based on the order of another array.
 * @param originalArray - The original array to be sorted.
 * @param orderArray - The array that defines the desired order.
 * @param key - The key in the original array's objects to match with the order array.
 * @returns A new array sorted according to the order array.
 * @example
 * ```ts
 * const originalArray = [
 *   { id: '3', name: 'Item 3' },
 *   { id: '1', name: 'Item 1' },
 *   { id: '2', name: 'Item 2' },
 * ];
 * const orderArray = ['1', '2', '3'];
 * const sortedArray = mapOrder(originalArray, orderArray, 'id');
 * // sortedArray will be:
 * // [
 * //   { id: '1', name: 'Item 1' },
 * //   { id: '2', name: 'Item 2' },
 * //   { id: '3', name: 'Item 3' },
 * // ]
 * ```
 */
export const mapOrder = <T extends Record<string, any>>(
  originalArray?: T[],
  orderArray?: string[],
  key?: keyof T
): T[] => {
  if (!originalArray || !orderArray || !key) return [];

  const clonedArray = [...originalArray];
  const orderedArray = clonedArray.sort((a, b) => {
    return orderArray.indexOf(a[key] as string) - orderArray.indexOf(b[key] as string);
  });

  return orderedArray;
};
