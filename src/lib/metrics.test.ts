import { describe, expect, it } from "vitest";
import { contributionMargin, localHour, occupancy, pctChange, periodRange, satisfactionIndex } from "./metrics";

describe("metrics", () => {
  it("contribution margin = (receita - custo) / receita", () => {
    expect(contributionMargin(100, 60)).toBe(40);
    expect(contributionMargin(0, 10)).toBeNull();
  });
  it("occupancy = ocupadas / total", () => {
    expect(occupancy(16, 32)).toBe(50);
    expect(occupancy(3, 0)).toBeNull();
  });
  it("percent change returns null without a baseline", () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(5, 0)).toBeNull();
  });
  it("satisfaction index scales 0-10 scores to 0-100", () => {
    expect(satisfactionIndex([8, 10])).toBe(90);
    expect(satisfactionIndex([])).toBeNull();
  });
  it("uses São Paulo local time for hours and days", () => {
    expect(localHour("2026-11-25T15:00:00Z")).toBe(12);
    const { from } = periodRange("hoje", new Date("2026-11-26T02:25:00Z"));
    expect(from.toISOString()).toBe("2026-11-25T03:00:00.000Z");
  });
});
