import { describe, expect, it } from "vitest";

import {
  getCalendarMonthRange,
  getCompanyMonthKey,
  parseMonthKey,
  shiftMonthKey,
} from "@/lib/domain/achievements/calendar";
import {
  applyAchievementDenseRank,
  calculateAchievementAmounts,
} from "@/lib/domain/achievements/ranking";
import { getAchievementProgress } from "@/lib/domain/achievements/rules";

describe("achievement rules", () => {
  it("resolves every monthly sent tier at its boundary", () => {
    const boundaries = [
      [1, "Stone"],
      [25, "Bronze"],
      [50, "Silver"],
      [100, "Gold"],
      [200, "Platinum"],
      [500, "Diamond"],
    ] as const;

    for (const [amount, tier] of boundaries) {
      expect(getAchievementProgress(amount, "sent", "month").tier).toBe(tier);
    }
  });

  it("reports progress from the current threshold to the next", () => {
    const result = getAchievementProgress(75, "received", "month");

    expect(result).toMatchObject({
      tier: "Silver",
      nextTier: "Gold",
      currentThreshold: 50,
      nextThreshold: 100,
      progressPercent: 50,
    });
  });

  it("keeps total thresholds independently configurable", () => {
    expect(getAchievementProgress(25, "sent", "month").tier).toBe("Bronze");
    expect(getAchievementProgress(25, "total", "month").tier).toBe("Stone");
  });

  it("caps Diamond progress and handles zero activity", () => {
    expect(getAchievementProgress(0, "sent", "allTime")).toMatchObject({
      tier: null,
      nextTier: "Stone",
      progressPercent: 0,
    });
    expect(getAchievementProgress(10_000, "total", "allTime")).toMatchObject({
      tier: "Diamond",
      nextTier: null,
      progressPercent: 100,
    });
  });
});

describe("achievement aggregation and ranking", () => {
  it("calculates multi-recipient sent, received, and total amounts", () => {
    const amounts = calculateAchievementAmounts(
      ["sender", "alice", "bob"],
      [
        {
          senderId: "sender",
          pointsPerRecipient: 10,
          recipientIds: ["alice", "bob"],
        },
        {
          senderId: "alice",
          pointsPerRecipient: 5,
          recipientIds: ["sender"],
        },
      ],
    );

    expect(amounts.get("sender")).toEqual({
      sent: 20,
      received: 5,
      total: 25,
    });
    expect(amounts.get("alice")).toEqual({
      sent: 5,
      received: 10,
      total: 15,
    });
    expect(amounts.get("bob")).toEqual({
      sent: 0,
      received: 10,
      total: 10,
    });
  });

  it("includes zero amounts and applies stable dense ranks", () => {
    expect(
      applyAchievementDenseRank([
        { userId: "zero", amount: 0 },
        { userId: "b", amount: 10 },
        { userId: "a", amount: 10 },
      ]),
    ).toEqual([
      { userId: "a", amount: 10, rank: 1 },
      { userId: "b", amount: 10, rank: 1 },
      { userId: "zero", amount: 0, rank: 2 },
    ]);
  });
});

describe("achievement calendar months", () => {
  it("parses and shifts month keys across year boundaries", () => {
    expect(parseMonthKey("2026-07")).toEqual({ year: 2026, month: 7 });
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });

  it("uses the company timezone for the current month", () => {
    const instant = new Date("2026-08-01T02:00:00.000Z");
    expect(getCompanyMonthKey(instant, "America/Los_Angeles")).toBe("2026-07");
  });

  it("returns DST-aware UTC boundaries for a calendar month", () => {
    const range = getCalendarMonthRange("2026-03", "America/Los_Angeles");

    expect(range.start.toISOString()).toBe("2026-03-01T08:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-04-01T07:00:00.000Z");
  });
});
