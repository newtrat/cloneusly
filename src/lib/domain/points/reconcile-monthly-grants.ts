import "server-only";

import { Prisma } from "@prisma/client";

import { hashRequestInput } from "@/lib/domain/idempotency";
import { createCorrelationId, logOperation } from "@/lib/domain/logger";
import { withSerializableRetry } from "@/lib/domain/transaction-retry";
import { prisma } from "@/lib/prisma";
import {
  formatGrantMonth,
  getCompanyLocalGrantMonth,
  MONTHLY_GRANT_AMOUNT,
  MONTHLY_GRANT_IDEMPOTENCY_SCOPE,
  monthlyGrantIdempotencyKey,
} from "@/lib/domain/points/grant-month";

export type ReconcileMonthlyGrantsResult = {
  grantMonth: string;
  eligibleUsers: number;
  grantedUsers: number;
  alreadyGrantedUsers: number;
  failedUsers: number;
  durationMs: number;
};

export async function reconcileMonthlyGrants(): Promise<ReconcileMonthlyGrantsResult> {
  const correlationId = createCorrelationId();
  const started = Date.now();
  const grantMonth = getCompanyLocalGrantMonth();
  const grantMonthLabel = formatGrantMonth(grantMonth);

  const activeUsers = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  let grantedUsers = 0;
  let alreadyGrantedUsers = 0;
  let failedUsers = 0;

  for (const { id: userId } of activeUsers) {
    try {
      const outcome = await grantUserMonthlyAllowance(userId, grantMonth);
      if (outcome === "granted") grantedUsers += 1;
      else alreadyGrantedUsers += 1;
    } catch {
      failedUsers += 1;
      logOperation("error", "Monthly grant failed for user", {
        operation: "reconcileMonthlyGrants",
        correlationId,
        userId,
        grantMonth: grantMonthLabel,
      });
    }
  }

  logOperation("info", "Monthly grant reconciliation complete", {
    operation: "reconcileMonthlyGrants",
    correlationId,
    grantMonth: grantMonthLabel,
    eligibleUsers: activeUsers.length,
    grantedUsers,
    alreadyGrantedUsers,
    failedUsers,
  });

  return {
    grantMonth: grantMonthLabel,
    eligibleUsers: activeUsers.length,
    grantedUsers,
    alreadyGrantedUsers,
    failedUsers,
    durationMs: Date.now() - started,
  };
}

export type GrantOutcome = "granted" | "already_granted";

export async function grantUserMonthlyAllowance(
  userId: string,
  grantMonth: Date,
): Promise<GrantOutcome> {
  const idempotencyKey = monthlyGrantIdempotencyKey(userId, grantMonth);
  const requestHash = hashRequestInput({
    userId,
    grantMonth: formatGrantMonth(grantMonth),
    amount: MONTHLY_GRANT_AMOUNT,
  });

  const existing = await prisma.pointTransaction.findUnique({
    where: {
      idempotencyScope_kind_idempotencyKey: {
        idempotencyScope: MONTHLY_GRANT_IDEMPOTENCY_SCOPE,
        kind: "MONTHLY_GRANT",
        idempotencyKey,
      },
    },
  });

  if (existing) {
    return "already_granted";
  }

  try {
    await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx) => {
          const priorGrant = await tx.monthlyGrant.findUnique({
            where: {
              userId_grantMonth: { userId, grantMonth },
            },
          });
          if (priorGrant) return;

          const now = new Date();
          const transaction = await tx.pointTransaction.create({
            data: {
              kind: "MONTHLY_GRANT",
              actorUserId: null,
              idempotencyScope: MONTHLY_GRANT_IDEMPOTENCY_SCOPE,
              idempotencyKey,
              requestHash,
              createdAt: now,
            },
          });

          await tx.monthlyGrant.create({
            data: {
              transactionId: transaction.id,
              userId,
              grantMonth,
              amount: MONTHLY_GRANT_AMOUNT,
              createdAt: now,
            },
          });

          await tx.pointEntry.create({
            data: {
              transactionId: transaction.id,
              userId,
              bucket: "GIVING",
              delta: MONTHLY_GRANT_AMOUNT,
              createdAt: now,
            },
          });

          await tx.pointAccount.update({
            where: { userId },
            data: { givingBalance: { increment: MONTHLY_GRANT_AMOUNT } },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
    return "granted";
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return "already_granted";
    }
    throw error;
  }
}
