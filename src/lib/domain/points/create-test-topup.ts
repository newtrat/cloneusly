import "server-only";

import { Prisma } from "@prisma/client";

import { requireActiveUser } from "@/lib/auth/require-user";
import { getEnv } from "@/lib/env";
import {
  hashRequestInput,
  userIdempotencyScope,
} from "@/lib/domain/idempotency";
import { createCorrelationId, logOperation } from "@/lib/domain/logger";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import { withSerializableRetry } from "@/lib/domain/transaction-retry";
import { prisma } from "@/lib/prisma";
import { parseCreateTestTopUpInput } from "@/lib/validation/topup";

export type CreateTestTopUpData = {
  topUpId: string;
  transactionId: string;
  amount: number;
  givingBalance: number;
  createdAt: string;
  testActivity: true;
};

export async function createTestTopUp(
  input: unknown,
): Promise<CommandResult<CreateTestTopUpData>> {
  const correlationId = createCorrelationId();
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const user = authResult.data;
  const env = getEnv();

  if (!env.ENABLE_TEST_TOPUPS) {
    return err("TEST_MODE_DISABLED", "Test top-ups are disabled.", {
      correlationId,
    });
  }

  if (user.role !== "TESTER") {
    return err("FORBIDDEN", "Only testers can add test points.", {
      correlationId,
    });
  }

  const parsed = parseCreateTestTopUpInput(input, env.MAX_TEST_TOPUP_POINTS);
  if (!parsed.ok) {
    return err("VALIDATION_ERROR", "Invalid top-up input.", {
      fieldErrors: parsed.fieldErrors,
      correlationId,
    });
  }

  const data = parsed.data;
  const requestHash = hashRequestInput({ amount: data.amount });
  const idempotencyScope = userIdempotencyScope(user.id);

  const existing = await prisma.pointTransaction.findUnique({
    where: {
      idempotencyScope_kind_idempotencyKey: {
        idempotencyScope,
        kind: "TEST_TOP_UP",
        idempotencyKey: data.requestId,
      },
    },
    include: { testTopUp: true },
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      return err(
        "IDEMPOTENCY_CONFLICT",
        "This request ID was already used with different input.",
        { correlationId },
      );
    }
    if (!existing.testTopUp) {
      return err("INTERNAL_ERROR", "Test top-up record missing.", {
        correlationId,
      });
    }
    const account = await prisma.pointAccount.findUnique({
      where: { userId: user.id },
    });
    if (!account) {
      return err("INTERNAL_ERROR", "Point account not found.", {
        correlationId,
      });
    }
    return ok(buildSuccess(existing.testTopUp, account.givingBalance));
  }

  try {
    const result = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx) => {
          const now = new Date();
          const transaction = await tx.pointTransaction.create({
            data: {
              kind: "TEST_TOP_UP",
              actorUserId: user.id,
              idempotencyScope,
              idempotencyKey: data.requestId,
              requestHash,
              createdAt: now,
            },
          });

          const topUp = await tx.testTopUp.create({
            data: {
              transactionId: transaction.id,
              actorUserId: user.id,
              beneficiaryUserId: user.id,
              amount: data.amount,
              createdAt: now,
            },
          });

          await tx.pointEntry.create({
            data: {
              transactionId: transaction.id,
              userId: user.id,
              bucket: "GIVING",
              delta: data.amount,
              createdAt: now,
            },
          });

          await tx.pointAccount.update({
            where: { userId: user.id },
            data: { givingBalance: { increment: data.amount } },
          });

          const account = await tx.pointAccount.findUniqueOrThrow({
            where: { userId: user.id },
          });

          return { topUp, account };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );

    logOperation("info", "Test top-up applied", {
      operation: "createTestTopUp",
      correlationId,
      userId: user.id,
      amount: data.amount,
    });

    return ok(buildSuccess(result.topUp, result.account.givingBalance));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const replay = await prisma.pointTransaction.findUnique({
        where: {
          idempotencyScope_kind_idempotencyKey: {
            idempotencyScope,
            kind: "TEST_TOP_UP",
            idempotencyKey: data.requestId,
          },
        },
        include: { testTopUp: true },
      });
      if (replay?.testTopUp && replay.requestHash === requestHash) {
        const account = await prisma.pointAccount.findUnique({
          where: { userId: user.id },
        });
        if (account) {
          return ok(buildSuccess(replay.testTopUp, account.givingBalance));
        }
      }
      return err(
        "IDEMPOTENCY_CONFLICT",
        "This request ID was already used with different input.",
        { correlationId },
      );
    }

    logOperation("error", "Test top-up failed", {
      operation: "createTestTopUp",
      correlationId,
      userId: user.id,
    });

    return err("INTERNAL_ERROR", "Unable to add test points.", {
      correlationId,
    });
  }
}

function buildSuccess(
  topUp: { id: string; transactionId: string; amount: number; createdAt: Date },
  givingBalance: number,
): CreateTestTopUpData {
  return {
    topUpId: topUp.id,
    transactionId: topUp.transactionId,
    amount: topUp.amount,
    givingBalance,
    createdAt: topUp.createdAt.toISOString(),
    testActivity: true,
  };
}
