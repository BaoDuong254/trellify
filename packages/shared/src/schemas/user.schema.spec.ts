import { describe, expect, it } from "vitest";

import { USER_UPDATE_SCHEMA } from "@workspace/shared/schemas/user.schema";

describe("USER_UPDATE_SCHEMA displayName", () => {
  it.each([
    ["an empty string", ""],
    ["only whitespace", " ".repeat(3)],
    ["over 50 characters", "a".repeat(51)],
  ])("rejects %s", (_label, displayName) => {
    expect(USER_UPDATE_SCHEMA.safeParse({ displayName }).success).toBe(false);
  });

  it("trims a valid name", () => {
    expect(USER_UPDATE_SCHEMA.parse({ displayName: "  Bao  " }).displayName).toBe("Bao");
  });
});
