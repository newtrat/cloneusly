import "../fixtures/auth-mock";

import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";

import { convertReceivedPoints } from "@/lib/domain/points/convert-points";
import { createTestTopUp } from "@/lib/domain/points/create-test-topup";
import {
  grantUserMonthlyAllowance,
  reconcileMonthlyGrants,
} from "@/lib/domain/points/reconcile-monthly-grants";
import { sendRecognitionForUser } from "@/lib/domain/recognition/send-recognition";
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

describe.skipIf(!hasDatabase)("grants and top-ups integration", () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    clearSessionUser();
    process.env.ENABLE_TEST_TOPUPS = "true";
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("grants each active user once per month on repeated reconciliation", async () => {
    await createActiveUser({
      email: "grant-a@test.local",
      handle: "granta",
      name: "Grant A",
    });
    await createActiveUser({
      email: "grant-b@test.local",
      handle: "grantb",
      name: "Grant B",
    });

    const first = await reconcileMonthlyGrants();
    const second = await reconcileMonthlyGrants();

    expect(first.grantedUsers).toBe(2);
    expect(second.grantedUsers).toBe(0);
    expect(second.alreadyGrantedUsers).toBe(2);

    const prisma = getTestPrisma();
    const grants = await prisma.monthlyGrant.count();
    expect(grants).toBe(2);
  });

  it("resets the giving allowance each month instead of accumulating, leaving received untouched", async () => {
    const prisma = getTestPrisma();
    const alice = await createActiveUser({
      email: "reset-a@test.local",
      handle: "reseta",
      name: "Reset A",
    });
    const bob = await createActiveUser({
      email: "reset-b@test.local",
      handle: "resetb",
      name: "Reset B",
    });

    const month1 = new Date("2026-01-01T00:00:00.000Z");
    const month2 = new Date("2026-02-01T00:00:00.000Z");

    // Month 1: allowance granted, then Alice spends 60 of it on Bob.
    await grantUserMonthlyAllowance(alice.id, month1);
    await createRecognition({
      senderId: alice.id,
      recipientIds: [bob.id],
      pointsPerRecipient: 60,
    });

    const aliceAfterMonth1 = await prisma.pointAccount.findUniqueOrThrow({
      where: { userId: alice.id },
    });
    expect(aliceAfterMonth1.givingBalance).toBe(40);

    // Month 2: leftover expires and the allowance resets to exactly 100
    // (cumulative behavior would have produced 140).
    const outcome = await grantUserMonthlyAllowance(alice.id, month2);
    expect(outcome).toBe("granted");

    const aliceAfterMonth2 = await prisma.pointAccount.findUniqueOrThrow({
      where: { userId: alice.id },
    });
    expect(aliceAfterMonth2.givingBalance).toBe(100);
    expect(aliceAfterMonth2.receivedBalance).toBe(0);

    // Received points accumulate and are never touched by the monthly reset.
    const bobAccount = await prisma.pointAccount.findUniqueOrThrow({
      where: { userId: bob.id },
    });
    expect(bobAccount.receivedBalance).toBe(60);

    await expectLedgerMatchesBalances(alice.id);
    await expectLedgerMatchesBalances(bob.id);
  });

  it("preserves converted points across the monthly reset while expiring unused allowance", async () => {
    const prisma = getTestPrisma();
    const alice = await createActiveUser({
      email: "conv-a@test.local",
      handle: "conva",
      name: "Conv A",
    });
    const bob = await createActiveUser({
      email: "conv-b@test.local",
      handle: "convb",
      name: "Conv B",
    });

    const month1 = new Date("2026-01-01T00:00:00.000Z");
    const month2 = new Date("2026-02-01T00:00:00.000Z");

    // Bob recognizes Alice so she has received points to convert.
    await grantUserMonthlyAllowance(bob.id, month1);
    await createRecognition({
      senderId: bob.id,
      recipientIds: [alice.id],
      pointsPerRecipient: 60,
    });

    // Alice gets her allowance and converts 50 received -> giving.
    await grantUserMonthlyAllowance(alice.id, month1);
    mockSessionUser(toAuthenticatedUser(alice));
    const conversion = await convertReceivedPoints({
      requestId: "conv-req-1",
      amount: 50,
    });
    expect(conversion.ok).toBe(true);

    const aliceAfterConvert = await prisma.pointAccount.findUniqueOrThrow({
      where: { userId: alice.id },
    });
    expect(aliceAfterConvert.givingBalance).toBe(150); // 100 allowance + 50 converted
    expect(aliceAfterConvert.convertedGivingBalance).toBe(50);
    expect(aliceAfterConvert.receivedBalance).toBe(10);

    // New month: unused allowance (100) expires, converted 50 is preserved,
    // fresh 100 is granted -> 150 (not 250 cumulative, not 100 pure reset).
    await grantUserMonthlyAllowance(alice.id, month2);

    const aliceAfterReset = await prisma.pointAccount.findUniqueOrThrow({
      where: { userId: alice.id },
    });
    expect(aliceAfterReset.givingBalance).toBe(150);
    expect(aliceAfterReset.convertedGivingBalance).toBe(50);
    expect(aliceAfterReset.receivedBalance).toBe(10);

    await expectLedgerMatchesBalances(alice.id);
  });

  it("spends the monthly allowance before dipping into converted points", async () => {
    const prisma = getTestPrisma();
    const alice = await createActiveUser({
      email: "dip-a@test.local",
      handle: "dipa",
      name: "Dip A",
    });
    const bob = await createActiveUser({
      email: "dip-b@test.local",
      handle: "dipb",
      name: "Dip B",
    });
    const month1 = new Date("2026-01-01T00:00:00.000Z");

    // Give Alice received points (from Bob) and let her convert 80 of them.
    await grantUserMonthlyAllowance(bob.id, month1);
    await createRecognition({
      senderId: bob.id,
      recipientIds: [alice.id],
      pointsPerRecipient: 80,
    });
    await grantUserMonthlyAllowance(alice.id, month1);
    mockSessionUser(toAuthenticatedUser(alice));
    await convertReceivedPoints({ requestId: "dip-conv", amount: 80 });

    // Alice now has giving 180 (100 allowance + 80 converted).
    const aliceUser = toAuthenticatedUser(alice);

    // Spend 30 — within the allowance, converted points untouched.
    const r1 = await sendRecognitionForUser(aliceUser, {
      requestId: "dip-send-1",
      recipientIds: [bob.id],
      pointsPerRecipient: 30,
      text: "thanks",
    });
    expect(r1.ok).toBe(true);
    let acct = await prisma.pointAccount.findUniqueOrThrow({
      where: { userId: alice.id },
    });
    expect(acct.givingBalance).toBe(150);
    expect(acct.convertedGivingBalance).toBe(80);

    // Spend 120 — allowance left is 70, so this dips 50 into converted points.
    const r2 = await sendRecognitionForUser(aliceUser, {
      requestId: "dip-send-2",
      recipientIds: [bob.id],
      pointsPerRecipient: 120,
      text: "big thanks",
    });
    expect(r2.ok).toBe(true);
    acct = await prisma.pointAccount.findUniqueOrThrow({
      where: { userId: alice.id },
    });
    expect(acct.givingBalance).toBe(30);
    expect(acct.convertedGivingBalance).toBe(30);

    await expectLedgerMatchesBalances(alice.id);
  });

  it("skips inactive users for monthly grants", async () => {
    const prisma = getTestPrisma();
    const inactive = await createActiveUser({
      email: "inactive@test.local",
      handle: "inactive",
      name: "Inactive",
    });
    await prisma.user.update({
      where: { id: inactive.id },
      data: { status: "INACTIVE" },
    });
    await createActiveUser({
      email: "active@test.local",
      handle: "active",
      name: "Active",
    });

    const result = await reconcileMonthlyGrants();
    expect(result.grantedUsers).toBe(1);
  });

  it("allows tester self top-ups with journal entries", async () => {
    const tester = await createActiveUser({
      email: "tester@test.local",
      handle: "tester",
      name: "Tester",
      role: "TESTER",
      givingBalance: 0,
    });

    mockSessionUser(toAuthenticatedUser({ ...tester, role: "TESTER" }));

    const result = await createTestTopUp({
      requestId: "topup-req-1",
      amount: 50,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.givingBalance).toBe(50);
    expect(result.data.testActivity).toBe(true);
    await expectLedgerMatchesBalances(tester.id);
  });

  it("rejects top-ups for non-testers", async () => {
    const member = await createActiveUser({
      email: "member@test.local",
      handle: "member",
      name: "Member",
    });

    mockSessionUser(toAuthenticatedUser(member));

    const result = await createTestTopUp({
      requestId: "topup-req-2",
      amount: 50,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("FORBIDDEN");
  });

  it("rejects top-ups when test mode disabled", async () => {
    process.env.ENABLE_TEST_TOPUPS = "false";
    vi.resetModules();

    const tester = await createActiveUser({
      email: "tester2@test.local",
      handle: "tester2",
      name: "Tester2",
      role: "TESTER",
    });

    mockSessionUser(toAuthenticatedUser({ ...tester, role: "TESTER" }));

    const { createTestTopUp: topUp } = await import(
      "@/lib/domain/points/create-test-topup"
    );
    const { resetEnvCache } = await import("@/lib/env");
    resetEnvCache();

    const result = await topUp({ requestId: "topup-req-3", amount: 10 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("TEST_MODE_DISABLED");
  });
});
