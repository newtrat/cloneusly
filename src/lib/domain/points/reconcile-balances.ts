import "server-only";

import { prisma } from "@/lib/prisma";

export type BalanceMismatch = {
  userId: string;
  bucket: "GIVING" | "RECEIVED";
  projectedBalance: number;
  ledgerSum: number;
};

export type ReconcileBalancesReport = {
  checkedUsers: number;
  mismatches: BalanceMismatch[];
  ok: boolean;
};

export async function reconcileBalances(): Promise<ReconcileBalancesReport> {
  const accounts = await prisma.pointAccount.findMany({
    select: {
      userId: true,
      givingBalance: true,
      receivedBalance: true,
    },
  });

  const mismatches: BalanceMismatch[] = [];

  for (const account of accounts) {
    const entries = await prisma.pointEntry.groupBy({
      by: ["bucket"],
      where: { userId: account.userId },
      _sum: { delta: true },
    });

    const givingSum =
      entries.find((e) => e.bucket === "GIVING")?._sum.delta ?? 0;
    const receivedSum =
      entries.find((e) => e.bucket === "RECEIVED")?._sum.delta ?? 0;

    if (account.givingBalance !== givingSum) {
      mismatches.push({
        userId: account.userId,
        bucket: "GIVING",
        projectedBalance: account.givingBalance,
        ledgerSum: givingSum,
      });
    }

    if (account.receivedBalance !== receivedSum) {
      mismatches.push({
        userId: account.userId,
        bucket: "RECEIVED",
        projectedBalance: account.receivedBalance,
        ledgerSum: receivedSum,
      });
    }
  }

  return {
    checkedUsers: accounts.length,
    mismatches,
    ok: mismatches.length === 0,
  };
}
