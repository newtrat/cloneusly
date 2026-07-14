import "../fixtures/auth-mock";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getAchievementLeaderboard } from "@/lib/dal/achievements";
import {
  clearSessionUser,
  mockSessionUser,
  toAuthenticatedUser,
} from "../fixtures/auth-mock";
import {
  disconnectTestDatabase,
  getTestDatabaseUrl,
  getTestPrisma,
  resetTestDatabase,
} from "../fixtures/database";
import { createActiveUser, createRecognition } from "../fixtures/factories";

const hasDatabase = Boolean(getTestDatabaseUrl());

describe.skipIf(!hasDatabase)("achievements integration", () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    clearSessionUser();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("ranks all active users and highlights the viewer's three metrics", async () => {
    const viewer = await createActiveUser({
      email: "achievement-viewer@test.local",
      handle: "achievementviewer",
      name: "Achievement Viewer",
    });
    const sender = await createActiveUser({
      email: "achievement-sender@test.local",
      handle: "achievementsender",
      name: "Achievement Sender",
      givingBalance: 500,
    });
    const alice = await createActiveUser({
      email: "achievement-alice@test.local",
      handle: "achievementalice",
      name: "Achievement Alice",
    });
    mockSessionUser(toAuthenticatedUser(viewer));

    await createRecognition({
      senderId: sender.id,
      recipientIds: [viewer.id, alice.id],
      pointsPerRecipient: 30,
      createdAt: new Date("2026-07-10T18:00:00.000Z"),
    });
    await createRecognition({
      senderId: viewer.id,
      recipientIds: [alice.id],
      pointsPerRecipient: 10,
      createdAt: new Date("2026-07-11T18:00:00.000Z"),
    });

    const result = await getAchievementLeaderboard({
      period: "month",
      metric: "total",
      monthKey: "2026-07",
      asOf: new Date("2026-07-15T18:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.entries).toHaveLength(3);
    expect(
      result.data.viewerAchievements.map(({ metric, amount, tier }) => ({
        metric,
        amount,
        tier,
      })),
    ).toEqual([
      { metric: "sent", amount: 10, tier: "Stone" },
      { metric: "received", amount: 30, tier: "Bronze" },
      { metric: "total", amount: 40, tier: "Stone" },
    ]);
    expect(result.data.entries[0]).toMatchObject({
      user: { id: sender.id },
      amount: 60,
      rank: 1,
    });
    expect(
      result.data.entries.find((entry) => entry.user.id === viewer.id),
    ).toMatchObject({ amount: 40, isViewer: true });
  });

  it("supports historical months, all time, and inactive-user exclusion", async () => {
    const viewer = await createActiveUser({
      email: "history-viewer@test.local",
      handle: "historyviewer",
      name: "History Viewer",
      givingBalance: 500,
    });
    const recipient = await createActiveUser({
      email: "history-recipient@test.local",
      handle: "historyrecipient",
      name: "History Recipient",
    });
    const inactive = await createActiveUser({
      email: "history-inactive@test.local",
      handle: "historyinactive",
      name: "History Inactive",
    });
    mockSessionUser(toAuthenticatedUser(viewer));

    await createRecognition({
      senderId: viewer.id,
      recipientIds: [recipient.id],
      pointsPerRecipient: 20,
      createdAt: new Date("2026-06-15T18:00:00.000Z"),
    });
    await createRecognition({
      senderId: viewer.id,
      recipientIds: [recipient.id, inactive.id],
      pointsPerRecipient: 10,
      createdAt: new Date("2026-07-15T18:00:00.000Z"),
    });
    await getTestPrisma().user.update({
      where: { id: inactive.id },
      data: { status: "INACTIVE" },
    });

    const june = await getAchievementLeaderboard({
      period: "month",
      metric: "sent",
      monthKey: "2026-06",
      asOf: new Date("2026-07-20T18:00:00.000Z"),
    });
    const allTime = await getAchievementLeaderboard({
      period: "allTime",
      metric: "sent",
      asOf: new Date("2026-07-20T18:00:00.000Z"),
    });

    expect(june.ok).toBe(true);
    expect(allTime.ok).toBe(true);
    if (!june.ok || !allTime.ok) return;

    expect(june.data.entries).toHaveLength(2);
    expect(june.data.entries[0]).toMatchObject({
      user: { id: viewer.id },
      amount: 20,
    });
    expect(allTime.data.entries).toHaveLength(2);
    expect(allTime.data.entries[0]).toMatchObject({
      user: { id: viewer.id },
      amount: 40,
    });
    expect(
      allTime.data.entries.some((entry) => entry.user.id === inactive.id),
    ).toBe(false);
  });
});
