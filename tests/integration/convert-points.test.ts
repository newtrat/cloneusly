import "../fixtures/auth-mock";

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import { convertReceivedPoints } from "@/lib/domain/points/convert-points";
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
import { createActiveUser } from "../fixtures/factories";
import { expectLedgerMatchesBalances } from "../fixtures/ledger-assertions";
import { getTestPrisma } from "../fixtures/database";

const hasDatabase = Boolean(getTestDatabaseUrl());

describe.skipIf(!hasDatabase)("convertReceivedPoints integration", () => {
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

  it("converts received to giving one-to-one atomically", async () => {
    const user = await createActiveUser({
      email: "convert@test.local",
      handle: "convert",
      name: "Convert",
      givingBalance: 10,
      receivedBalance: 40,
    });

    mockSessionUser(toAuthenticatedUser(user));

    const result = await convertReceivedPoints({
      requestId: "convert-req-1",
      amount: 25,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.amount).toBe(25);
    expect(result.data.givingBalance).toBe(35);
    expect(result.data.receivedBalance).toBe(15);

    const prisma = getTestPrisma();
    const account = await prisma.pointAccount.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(account.givingBalance).toBe(35);
    expect(account.receivedBalance).toBe(15);
    await expectLedgerMatchesBalances(user.id);
  });

  it("rejects insufficient received points", async () => {
    const user = await createActiveUser({
      email: "convert2@test.local",
      handle: "convert2",
      name: "Convert2",
      receivedBalance: 5,
    });

    mockSessionUser(toAuthenticatedUser(user));

    const result = await convertReceivedPoints({
      requestId: "convert-req-2",
      amount: 10,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INSUFFICIENT_RECEIVED_POINTS");
  });

  it("replays idempotent requests", async () => {
    const user = await createActiveUser({
      email: "convert3@test.local",
      handle: "convert3",
      name: "Convert3",
      receivedBalance: 20,
    });

    mockSessionUser(toAuthenticatedUser(user));

    const input = { requestId: "convert-req-3", amount: 10 };
    const first = await convertReceivedPoints(input);
    const second = await convertReceivedPoints(input);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.data.conversionId).toBe(second.data.conversionId);

    const prisma = getTestPrisma();
    const conversions = await prisma.conversion.count({
      where: { userId: user.id },
    });
    expect(conversions).toBe(1);
  });
});
