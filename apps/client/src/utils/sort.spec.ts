import { describe, expect, it } from "vitest";

import { mapOrder } from "src/utils/sort";

describe("mapOrder", () => {
  const items = [
    { _id: "c", name: "C" },
    { _id: "a", name: "A" },
    { _id: "b", name: "B" },
  ];

  it("orders items by the position of their key in the order array", () => {
    expect(mapOrder(items, ["a", "b", "c"], "_id").map((item) => item._id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    mapOrder(items, ["a", "b", "c"], "_id");

    expect(items.map((item) => item._id)).toEqual(["c", "a", "b"]);
  });

  it("returns an empty array when any argument is missing", () => {
    expect(mapOrder(undefined, ["a"], "_id")).toEqual([]);
    expect(mapOrder(items, undefined, "_id")).toEqual([]);
    expect(mapOrder(items, ["a"])).toEqual([]);
  });
});
