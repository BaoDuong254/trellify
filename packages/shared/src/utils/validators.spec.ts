import { describe, expect, it } from "vitest";

import { EMAIL_RULE, OBJECT_ID_RULE, PASSWORD_RULE } from "@workspace/shared/utils/validators";

describe("OBJECT_ID_RULE", () => {
  it("matches upper- and lower-case hex", () => {
    expect(OBJECT_ID_RULE.test("65F1A2B3C4D5E6F7A8B9C0D1")).toBe(true);
    expect(OBJECT_ID_RULE.test("65f1a2b3c4d5e6f7a8b9c0d1")).toBe(true);
  });

  it("is anchored on both ends", () => {
    expect(OBJECT_ID_RULE.test(" 65f1a2b3c4d5e6f7a8b9c0d1")).toBe(false);
    expect(OBJECT_ID_RULE.test("65f1a2b3c4d5e6f7a8b9c0d1\n")).toBe(false);
  });
});

describe("PASSWORD_RULE", () => {
  it.each(["abcdefg1", "Str0ng!Passw0rd"])("accepts %s", (password) => {
    expect(PASSWORD_RULE.test(password)).toBe(true);
  });

  it.each([
    ["shorter than 8 characters", "abc123"],
    ["missing a digit", "abcdefgh"],
    ["missing a letter", "12345678"],
  ])("rejects a password %s", (_label, password) => {
    expect(PASSWORD_RULE.test(password)).toBe(false);
  });
});

describe("EMAIL_RULE", () => {
  it("accepts a plain address and rejects one without a domain", () => {
    expect(EMAIL_RULE.test("user@example.com")).toBe(true);
    expect(EMAIL_RULE.test("user@example")).toBe(false);
  });
});
