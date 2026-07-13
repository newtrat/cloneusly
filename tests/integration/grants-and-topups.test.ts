import "../fixtures/auth-mock";

import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";

import { createTestTopUp } from "@/lib/domain/points/create-test-topup";
import { reconcileMonthlyGrants } from "@/lib/domain/points/reconcile-monthly-grants";
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
import { createActiveUser } from "../fixtures/factories";
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
