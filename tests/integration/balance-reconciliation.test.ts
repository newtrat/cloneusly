import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { reconcileBalances } from "@/lib/domain/points/reconcile-balances";
import {
  disconnectTestDatabase,
  getTestDatabaseUrl,
  resetTestDatabase,
} from "../fixtures/database";
import { createActiveUser } from "../fixtures/factories";
import { expectLedgerMatchesBalances } from "../fixtures/ledger-assertions";

const hasDatabase = Boolean(getTestDatabaseUrl());

describe.skipIf(!hasDatabase)("balance reconciliation", () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("reports no mismatches when ledger matches balances", async () => {
    const user = await createActiveUser({
      email: "reconcile@test.local",
      handle: "reconcile",
      name: "Reconcile",
      givingBalance: 100,
      receivedBalance: 25,
    });

    await expectLedgerMatchesBalances(user.id);

    const report = await reconcileBalances();
    expect(report.ok).toBe(true);
    expect(report.checkedUsers).toBeGreaterThan(0);
    expect(report.mismatches).toHaveLength(0);
  });
});
