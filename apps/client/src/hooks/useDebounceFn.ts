import { useMemo } from "react";
import { debounce } from "lodash";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useDebounceFn = (fnToDebounce: any, delay = 500) => {
  if (isNaN(delay)) {
    throw new Error("Delay value should be a number.");
  }
  if (!fnToDebounce || typeof fnToDebounce !== "function") {
    throw new Error("Debounce must have a function");
  }
  return useMemo(() => debounce(fnToDebounce, delay), [fnToDebounce, delay]);
};
