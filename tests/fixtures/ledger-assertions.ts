import { expect } from "vitest";

import { getTestPrisma } from "./database";

export async function expectLedgerMatchesBalances(userId: string): Promise<void> {
  const prisma = getTestPrisma();

  const account = await prisma.pointAccount.findUniqueOrThrow({
    where: { userId },
  });

  const entries = await prisma.pointEntry.groupBy({
    by: ["bucket"],
    where: { userId },
    _sum: { delta: true },
  });

  const givingSum =
    entries.find((e) => e.bucket === "GIVING")?._sum.delta ?? 0;
  const receivedSum =
    entries.find((e) => e.bucket === "RECEIVED")?._sum.delta ?? 0;

  expect(account.givingBalance).toBe(givingSum);
  expect(account.receivedBalance).toBe(receivedSum);
}

export async function countPointEntriesForTransaction(
  transactionId: string,
): Promise<number> {
  const prisma = getTestPrisma();
  return prisma.pointEntry.count({ where: { transactionId } });
}
