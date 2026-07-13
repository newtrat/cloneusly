import "../fixtures/auth-mock";

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import { getLeaderboard } from "@/lib/dal/leaderboard";
import {
  clearSessionUser,
  mockSessionUser,
  toAuthenticatedUser,
} from "../fixtures/auth-mock";
import {
  disconnectTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
} from "../fixtures/database";
import { createActiveUser, createRecognition } from "../fixtures/factories";

const hasDatabase = Boolean(getTestDatabaseUrl());

describe.skipIf(!hasDatabase)("leaderboard integration", () => {
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

  it("includes recognition within rolling window boundaries", async () => {
    const viewer = await createActiveUser({
      email: "lb-viewer@test.local",
      handle: "lbviewer",
      name: "LB Viewer",
    });
    const sender = await createActiveUser({
      email: "lb-sender@test.local",
      handle: "lbsender",
      name: "LB Sender",
      givingBalance: 500,
    });
    const alice = await createActiveUser({
      email: "lb-alice@test.local",
      handle: "lbalice",
      name: "LB Alice",
    });
    const bob = await createActiveUser({
      email: "lb-bob@test.local",
      handle: "lbbob",
      name: "LB Bob",
    });

    mockSessionUser(toAuthenticatedUser(viewer));

    const asOf = new Date("2026-07-13T12:00:00.000Z");

    await createRecognition({
      senderId: sender.id,
      recipientIds: [alice.id],
      pointsPerRecipient: 10,
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
    });
    await createRecognition({
      senderId: sender.id,
      recipientIds: [bob.id],
      pointsPerRecipient: 20,
      createdAt: new Date("2026-07-12T13:00:00.000Z"),
    });
    await createRecognition({
      senderId: sender.id,
      recipientIds: [alice.id],
      pointsPerRecipient: 5,
      hashtags: ["teamwork"],
      createdAt: new Date("2026-07-12T14:00:00.000Z"),
    });

    const overall = await getLeaderboard({ period: "day", asOf });
    expect(overall.ok).toBe(true);
    if (!overall.ok) return;

    const aliceEntry = overall.data.entries.find((e) => e.user.handle === "lbalice");
    const bobEntry = overall.data.entries.find((e) => e.user.handle === "lbbob");
    expect(aliceEntry?.pointsReceived).toBe(15);
    expect(bobEntry?.pointsReceived).toBe(20);
    expect(bobEntry?.rank).toBe(1);
    expect(aliceEntry?.rank).toBe(2);
  });

  it("filters by hashtag independently", async () => {
    const viewer = await createActiveUser({
      email: "lb-viewer2@test.local",
      handle: "lbviewer2",
      name: "LB Viewer2",
    });
    const sender = await createActiveUser({
      email: "lb-sender2@test.local",
      handle: "lbsender2",
      name: "LB Sender2",
      givingBalance: 500,
    });
    const alice = await createActiveUser({
      email: "lb-alice2@test.local",
      handle: "lbalice2",
      name: "LB Alice2",
    });

    mockSessionUser(toAuthenticatedUser(viewer));

    const asOf = new Date("2026-07-13T12:00:00.000Z");
    await createRecognition({
      senderId: sender.id,
      recipientIds: [alice.id],
      pointsPerRecipient: 10,
      hashtags: ["kudos"],
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
    });
    await createRecognition({
      senderId: sender.id,
      recipientIds: [alice.id],
      pointsPerRecipient: 30,
      hashtags: ["other"],
      createdAt: new Date("2026-07-12T13:00:00.000Z"),
    });

    const filtered = await getLeaderboard({
      period: "day",
      hashtag: "kudos",
      asOf,
    });
    expect(filtered.ok).toBe(true);
    if (!filtered.ok) return;
    expect(filtered.data.entries).toHaveLength(1);
    expect(filtered.data.entries[0]?.pointsReceived).toBe(10);
  });

  it("returns empty state for unknown hashtag", async () => {
    const viewer = await createActiveUser({
      email: "lb-viewer3@test.local",
      handle: "lbviewer3",
      name: "LB Viewer3",
    });
    mockSessionUser(toAuthenticatedUser(viewer));

    const result = await getLeaderboard({
      period: "week",
      hashtag: "missing-tag",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.entries).toHaveLength(0);
  });
});
