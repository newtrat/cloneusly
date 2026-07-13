import { describe, expect, it } from "vitest";

import {
  applyDenseRank,
  getWindowStart,
} from "@/lib/domain/leaderboard/ranking";

describe("leaderboard ranking", () => {
  it("maps day period to rolling 24 hours", () => {
    const asOf = new Date("2026-07-13T12:00:00.000Z");
    const start = getWindowStart(asOf, "day");
    expect(asOf.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("uses captured asOf for window start", () => {
    const asOf = new Date("2026-07-13T00:00:00.000Z");
    const weekStart = getWindowStart(asOf, "week");
    expect(weekStart.toISOString()).toBe("2026-07-06T00:00:00.000Z");
  });

  it("applies dense rank with stable user-id tie ordering", () => {
    const ranked = applyDenseRank([
      { userId: "user-b", pointsReceived: 20 },
      { userId: "user-a", pointsReceived: 20 },
      { userId: "user-c", pointsReceived: 10 },
    ]);

    expect(ranked).toEqual([
      { userId: "user-a", pointsReceived: 20, rank: 1 },
      { userId: "user-b", pointsReceived: 20, rank: 1 },
      { userId: "user-c", pointsReceived: 10, rank: 2 },
    ]);
  });
});
