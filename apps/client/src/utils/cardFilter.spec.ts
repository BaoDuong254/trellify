import { describe, expect, it } from "vitest";

import { buildCard } from "src/test/fixtures";
import { EMPTY_CARD_FILTER, countActiveFilters, matchesCardFilter } from "src/utils/cardFilter";

const now = new Date("2026-01-10T12:00:00Z").getTime();

describe("matchesCardFilter", () => {
  it("matches every card when no filter is set", () => {
    expect(matchesCardFilter(buildCard(), EMPTY_CARD_FILTER, now)).toBe(true);
    expect(countActiveFilters(EMPTY_CARD_FILTER)).toBe(0);
  });

  it("matches the keyword case-insensitively against the title", () => {
    const filter = { ...EMPTY_CARD_FILTER, keyword: "  SHIP " };
    expect(matchesCardFilter(buildCard({ title: "Ship the release" }), filter, now)).toBe(true);
    expect(matchesCardFilter(buildCard({ title: "Write docs" }), filter, now)).toBe(false);
  });

  it("matches any selected label or member", () => {
    const filter = { ...EMPTY_CARD_FILTER, labelIds: ["l1", "l2"], memberIds: ["u1"] };
    expect(matchesCardFilter(buildCard({ labelIds: ["l2"], memberIds: ["u1"] }), filter, now)).toBe(true);
    expect(matchesCardFilter(buildCard({ labelIds: ["l2"], memberIds: [] }), filter, now)).toBe(false);
    expect(countActiveFilters(filter)).toBe(3);
  });

  it("filters by due status, including cards without a due date", () => {
    const overdue = buildCard({ dueDate: "2026-01-09T12:00:00Z" });
    const noDue = buildCard({ dueDate: null });
    expect(matchesCardFilter(overdue, { ...EMPTY_CARD_FILTER, due: "overdue" }, now)).toBe(true);
    expect(matchesCardFilter(noDue, { ...EMPTY_CARD_FILTER, due: "overdue" }, now)).toBe(false);
    expect(matchesCardFilter(noDue, { ...EMPTY_CARD_FILTER, due: "none" }, now)).toBe(true);
  });
});
