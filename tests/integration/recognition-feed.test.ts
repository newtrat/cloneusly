import "../fixtures/auth-mock";

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import { getFeed } from "@/lib/dal/recognition-feed";
import { getUserActivity } from "@/lib/dal/user-activity";
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

describe.skipIf(!hasDatabase)("recognition feed integration", () => {
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

  it("returns newest-first feed with stable cursor pagination", async () => {
    const viewer = await createActiveUser({
      email: "viewer@test.local",
      handle: "viewer",
      name: "Viewer",
    });
    const sender = await createActiveUser({
      email: "sender@test.local",
      handle: "sender",
      name: "Sender",
      givingBalance: 1000,
    });
    const recipient = await createActiveUser({
      email: "rec@test.local",
      handle: "rec",
      name: "Rec",
    });

    mockSessionUser(toAuthenticatedUser(viewer));

    const older = await createRecognition({
      senderId: sender.id,
      recipientIds: [recipient.id],
      pointsPerRecipient: 5,
      text: "Older",
      createdAt: new Date("2026-07-10T10:00:00.000Z"),
    });
    const newer = await createRecognition({
      senderId: sender.id,
      recipientIds: [recipient.id],
      pointsPerRecipient: 10,
      text: "Newer",
      createdAt: new Date("2026-07-11T10:00:00.000Z"),
    });

    const page1 = await getFeed({ limit: 1 });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;
    expect(page1.data.items[0]?.id).toBe(newer.id);
    expect(page1.data.nextCursor).toBeTruthy();

    const page2 = await getFeed({
      limit: 1,
      cursor: page1.data.nextCursor ?? undefined,
    });
    expect(page2.ok).toBe(true);
    if (!page2.ok) return;
    expect(page2.data.items[0]?.id).toBe(older.id);
  });

  it("filters by normalized hashtag case-insensitively", async () => {
    const viewer = await createActiveUser({
      email: "viewer2@test.local",
      handle: "viewer2",
      name: "Viewer2",
    });
    const sender = await createActiveUser({
      email: "sender2@test.local",
      handle: "sender2",
      name: "Sender2",
      givingBalance: 100,
    });
    const recipient = await createActiveUser({
      email: "rec2@test.local",
      handle: "rec2",
      name: "Rec2",
    });

    mockSessionUser(toAuthenticatedUser(viewer));

    await createRecognition({
      senderId: sender.id,
      recipientIds: [recipient.id],
      pointsPerRecipient: 5,
      hashtags: ["TeamWork"],
    });
    await createRecognition({
      senderId: sender.id,
      recipientIds: [recipient.id],
      pointsPerRecipient: 5,
      hashtags: ["other"],
    });

    const filtered = await getFeed({ hashtag: "TEAMWORK" });
    expect(filtered.ok).toBe(true);
    if (!filtered.ok) return;
    expect(filtered.data.items).toHaveLength(1);
    expect(filtered.data.items[0]?.hashtags).toContain("TeamWork");
  });

  it("filters by sender or recipient user", async () => {
    const viewer = await createActiveUser({
      email: "viewer3@test.local",
      handle: "viewer3",
      name: "Viewer3",
    });
    const alice = await createActiveUser({
      email: "alice@test.local",
      handle: "alice",
      name: "Alice",
      givingBalance: 100,
    });
    const bob = await createActiveUser({
      email: "bob@test.local",
      handle: "bob",
      name: "Bob",
    });

    mockSessionUser(toAuthenticatedUser(viewer));

    await createRecognition({
      senderId: alice.id,
      recipientIds: [bob.id],
      pointsPerRecipient: 5,
    });
    await createRecognition({
      senderId: bob.id,
      recipientIds: [alice.id],
      pointsPerRecipient: 5,
    });

    const aliceFeed = await getFeed({ userId: alice.id });
    expect(aliceFeed.ok).toBe(true);
    if (!aliceFeed.ok) return;
    expect(aliceFeed.data.items).toHaveLength(2);
  });

  it("shapes card view models with sender and recipients", async () => {
    const viewer = await createActiveUser({
      email: "viewer4@test.local",
      handle: "viewer4",
      name: "Viewer4",
    });
    const sender = await createActiveUser({
      email: "sender4@test.local",
      handle: "sender4",
      name: "Sender4",
      givingBalance: 50,
    });
    const recipient = await createActiveUser({
      email: "rec4@test.local",
      handle: "rec4",
      name: "Rec4",
    });

    mockSessionUser(toAuthenticatedUser(viewer));
    await createRecognition({
      senderId: sender.id,
      recipientIds: [recipient.id],
      pointsPerRecipient: 7,
      text: "Nice work",
    });

    const feed = await getFeed();
    expect(feed.ok).toBe(true);
    if (!feed.ok) return;
    const card = feed.data.items[0];
    expect(card?.sender.handle).toBe("sender4");
    expect(card?.recipients[0]?.handle).toBe("rec4");
    expect(card?.pointsPerRecipient).toBe(7);
    expect(card?.text).toBe("Nice work");
  });

  it("returns user activity with sent and received sections", async () => {
    const alice = await createActiveUser({
      email: "alice5@test.local",
      handle: "alice5",
      name: "Alice5",
      givingBalance: 100,
    });
    const bob = await createActiveUser({
      email: "bob5@test.local",
      handle: "bob5",
      name: "Bob5",
    });

    mockSessionUser(toAuthenticatedUser(alice));

    await createRecognition({
      senderId: alice.id,
      recipientIds: [bob.id],
      pointsPerRecipient: 5,
    });
    await createRecognition({
      senderId: bob.id,
      recipientIds: [alice.id],
      pointsPerRecipient: 3,
    });

    const activity = await getUserActivity({ userId: alice.id });
    expect(activity.ok).toBe(true);
    if (!activity.ok) return;
    expect(activity.data.sent.items).toHaveLength(1);
    expect(activity.data.received.items).toHaveLength(1);
  });
});
