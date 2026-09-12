import { describe, expect, it } from "vitest";

import {
  BOARD_ID_PARAMS_SCHEMA,
  MOVE_CARD_TO_DIFFERENT_COLUMN_SCHEMA,
  REMOVE_BOARD_MEMBER_PARAMS_SCHEMA,
  UPDATE_BOARD_SCHEMA,
} from "@workspace/shared/schemas/board.schema";

const VALID_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

describe("BOARD_ID_PARAMS_SCHEMA", () => {
  it("accepts a 24-character hex ObjectId", () => {
    expect(BOARD_ID_PARAMS_SCHEMA.safeParse({ id: VALID_ID }).success).toBe(true);
  });

  it.each([
    ["too short", "65f1a2b3"],
    ["too long", `${VALID_ID}00`],
    ["non-hex characters", "zzzzzzzzzzzzzzzzzzzzzzzz"],
    ["an empty string", ""],
    ["a path traversal attempt", "../../../../etc/passwd"],
  ])("rejects %s", (_label, id) => {
    expect(BOARD_ID_PARAMS_SCHEMA.safeParse({ id }).success).toBe(false);
  });
});

describe("REMOVE_BOARD_MEMBER_PARAMS_SCHEMA", () => {
  it("requires both ids to be valid ObjectIds", () => {
    expect(REMOVE_BOARD_MEMBER_PARAMS_SCHEMA.safeParse({ id: VALID_ID, userId: VALID_ID }).success).toBe(true);
    expect(REMOVE_BOARD_MEMBER_PARAMS_SCHEMA.safeParse({ id: VALID_ID, userId: "nope" }).success).toBe(false);
  });
});

describe("UPDATE_BOARD_SCHEMA", () => {
  it("strips ownerIds and memberIds so a request cannot grant itself membership", () => {
    const parsed = UPDATE_BOARD_SCHEMA.parse({
      title: "Roadmap",
      ownerIds: [VALID_ID],
      memberIds: [VALID_ID],
      _destroy: true,
    });

    expect(parsed).toEqual({ title: "Roadmap" });
  });

  it("accepts a partial update", () => {
    expect(UPDATE_BOARD_SCHEMA.safeParse({}).success).toBe(true);
  });

  it("rejects a malformed id inside columnOrderIds", () => {
    expect(UPDATE_BOARD_SCHEMA.safeParse({ columnOrderIds: [VALID_ID, "bad"] }).success).toBe(false);
  });
});

describe("MOVE_CARD_TO_DIFFERENT_COLUMN_SCHEMA", () => {
  it("defaults both card order arrays to empty", () => {
    const parsed = MOVE_CARD_TO_DIFFERENT_COLUMN_SCHEMA.parse({
      currentCardId: VALID_ID,
      prevColumnId: VALID_ID,
      nextColumnId: VALID_ID,
    });

    expect(parsed.prevCardOrderIds).toEqual([]);
    expect(parsed.nextCardOrderIds).toEqual([]);
  });
});
