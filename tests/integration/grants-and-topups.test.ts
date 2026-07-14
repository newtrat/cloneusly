import "../fixtures/auth-mock";

import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";

import { createTestTopUp } from "@/lib/domain/points/create-test-topup";
import {
  grantUserMonthlyAllowance,
  reconcileMonthlyGrants,
} from "@/lib/domain/points/reconcile-monthly-grants";
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
