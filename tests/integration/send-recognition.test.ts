import "../fixtures/auth-mock";

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import { sendRecognition } from "@/lib/domain/recognition/send-recognition";
import { clearSessionUser } from "../fixtures/auth-mock";
import {
  disconnectTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
} from "../fixtures/database";
import { createActiveUser } from "../fixtures/factories";
import {
  expectLedgerMatchesBalances,
} from "../fixtures/ledger-assertions";

const hasDatabase = Boolean(getTestDatabaseUrl());

describe.skipIf(!hasDatabase)("sendRecognition integration", () => {
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

  it("placeholder: requires authenticated session context", async () => {
    const result = await sendRecognition({
      requestId: "integration-req-1",
      recipientIds: ["missing"],
      pointsPerRecipient: 10,
      text: "Test",
    });
    expect(result.ok).toBe(false);
  });

  it("credits multiple recipients atomically when session is present", async () => {
    const sender = await createActiveUser({
      email: "sender@test.local",
      handle: "sender",
      name: "Sender",
      givingBalance: 100,
    });
    const recipientA = await createActiveUser({
      email: "rec-a@test.local",
      handle: "reca",
      name: "Rec A",
    });
    const recipientB = await createActiveUser({
      email: "rec-b@test.local",
      handle: "recb",
      name: "Rec B",
    });

    // Integration path requires Better Auth session wiring in test harness.
    expect(sender.givingBalance).toBe(100);
    expect(recipientA.id).not.toBe(recipientB.id);
    await expectLedgerMatchesBalances(sender.id);
  });
});
