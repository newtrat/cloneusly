import "../fixtures/auth-mock";

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import { addComment } from "@/lib/domain/recognition/add-comment";
import { toggleReaction } from "@/lib/domain/recognition/toggle-reaction";
import {
  clearSessionUser,
  mockSessionUser,
  toAuthenticatedUser,
} from "../fixtures/auth-mock";
import {
  disconnectTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
  getTestPrisma,
} from "../fixtures/database";
import { createActiveUser, createRecognition } from "../fixtures/factories";
import { expectLedgerMatchesBalances } from "../fixtures/ledger-assertions";

const hasDatabase = Boolean(getTestDatabaseUrl());

describe.skipIf(!hasDatabase)("social recognition integration", () => {
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

  it("toggles reactions without changing point balances", async () => {
    const sender = await createActiveUser({
      email: "soc-sender@test.local",
      handle: "socsender",
      name: "Soc Sender",
      givingBalance: 100,
    });
    const recipient = await createActiveUser({
      email: "soc-rec@test.local",
      handle: "socrec",
      name: "Soc Rec",
    });
    const reactor = await createActiveUser({
      email: "soc-react@test.local",
      handle: "socreact",
      name: "Soc React",
    });

    const recognition = await createRecognition({
      senderId: sender.id,
      recipientIds: [recipient.id],
      pointsPerRecipient: 10,
    });

    mockSessionUser(toAuthenticatedUser(reactor));

    const add = await toggleReaction({
      recognitionId: recognition.id,
      reactionType: "CLAP",
    });
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    expect(add.data.active).toBe(true);
    expect(add.data.count).toBe(1);

    const remove = await toggleReaction({
      recognitionId: recognition.id,
      reactionType: "CLAP",
    });
    expect(remove.ok).toBe(true);
    if (!remove.ok) return;
    expect(remove.data.active).toBe(false);
    expect(remove.data.count).toBe(0);

    await expectLedgerMatchesBalances(sender.id);
    await expectLedgerMatchesBalances(recipient.id);
  });

  it("creates deduplicated comment notifications for sender", async () => {
    const sender = await createActiveUser({
      email: "soc-sender2@test.local",
      handle: "socsender2",
      name: "Soc Sender2",
      givingBalance: 100,
    });
    const recipient = await createActiveUser({
      email: "soc-rec2@test.local",
      handle: "socrec2",
      name: "Soc Rec2",
    });
    const commenter = await createActiveUser({
      email: "soc-comment@test.local",
      handle: "soccomment",
      name: "Soc Comment",
    });

    const recognition = await createRecognition({
      senderId: sender.id,
      recipientIds: [recipient.id],
      pointsPerRecipient: 5,
    });

    mockSessionUser(toAuthenticatedUser(commenter));

    const result = await addComment({
      recognitionId: recognition.id,
      body: "Well deserved!",
    });
    expect(result.ok).toBe(true);

    const prisma = getTestPrisma();
    const notifications = await prisma.notification.findMany({
      where: {
        userId: sender.id,
        type: "RECOGNITION_COMMENT",
      },
    });
    expect(notifications).toHaveLength(1);
  });

  it("suppresses self-notifications for comments", async () => {
    const sender = await createActiveUser({
      email: "soc-sender3@test.local",
      handle: "socsender3",
      name: "Soc Sender3",
      givingBalance: 100,
    });
    const recipient = await createActiveUser({
      email: "soc-rec3@test.local",
      handle: "socrec3",
      name: "Soc Rec3",
    });

    const recognition = await createRecognition({
      senderId: sender.id,
      recipientIds: [recipient.id],
      pointsPerRecipient: 5,
    });

    mockSessionUser(toAuthenticatedUser(sender));

    await addComment({
      recognitionId: recognition.id,
      body: "Thanks all!",
    });

    const prisma = getTestPrisma();
    const selfNotifications = await prisma.notification.count({
      where: {
        userId: sender.id,
        actorUserId: sender.id,
        type: "RECOGNITION_COMMENT",
      },
    });
    expect(selfNotifications).toBe(0);
  });
});
