import { describe, expect, it } from "vitest";

import { captureArchivedPosition, resolveRestorePosition } from "src/utils/order-position";

const A = "a".repeat(24);
const B = "b".repeat(24);
const C = "c".repeat(24);
const D = "d".repeat(24);

describe("captureArchivedPosition", () => {
  it("records both neighbours and the index", () => {
    expect(captureArchivedPosition([A, B, C], B)).toEqual({ prevId: A, nextId: C, index: 1 });
  });

  it("records null neighbours at the edges and null when the id is missing", () => {
    expect(captureArchivedPosition([A, B], A)).toEqual({ prevId: null, nextId: B, index: 0 });
    expect(captureArchivedPosition([A, B], B)).toEqual({ prevId: A, nextId: null, index: 1 });
    expect(captureArchivedPosition([A], D)).toBeNull();
  });
});

describe("resolveRestorePosition", () => {
  const saved = { prevId: A, nextId: C, index: 1 };

  it("goes right after the previous neighbour, wherever it moved", () => {
    expect(resolveRestorePosition([C, A, D], saved)).toBe(2);
  });

  it("falls back to right before the next neighbour", () => {
    expect(resolveRestorePosition([D, C], saved)).toBe(1);
  });

  it("falls back to the saved index when both neighbours are gone", () => {
    expect(resolveRestorePosition([D], saved)).toBe(1);
  });

  it("appends when nothing was saved", () => {
    expect(resolveRestorePosition([A, C], null)).toBeNull();
    expect(resolveRestorePosition([A, C], undefined)).toBeNull();
  });
});
