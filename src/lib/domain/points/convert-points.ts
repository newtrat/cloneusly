import "server-only";

import { Prisma } from "@prisma/client";

import { requireActiveUser } from "@/lib/auth/require-user";
import {
  hashRequestInput,
  userIdempotencyScope,
} from "@/lib/domain/idempotency";
import { createCorrelationId, logOperation } from "@/lib/domain/logger";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import { withSerializableRetry } from "@/lib/domain/transaction-retry";
import { prisma } from "@/lib/prisma";
import { parseConvertReceivedPointsInput } from "@/lib/validation/conversion";

export type ConvertReceivedPointsData = {
  conversionId: string;
  transactionId: string;
  amount: number;
  givingBalance: number;
  receivedBalance: number;
  createdAt: string;
};

export async function convertReceivedPoints(
  input: unknown,
): Promise<CommandResult<ConvertReceivedPointsData>> {
  const correlationId = createCorrelationId();
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const user = authResult.data;
  const parsed = parseConvertReceivedPointsInput(input);
  if (!parsed.ok) {
    return err("VALIDATION_ERROR", "Invalid conversion input.", {
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
        kind: "CONVERSION",
        idempotencyKey: data.requestId,
      },
    },
    include: { conversion: true },
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      return err(
        "IDEMPOTENCY_CONFLICT",
        "This request ID was already used with different input.",
        { correlationId },
      );
    }
    if (!existing.conversion) {
      return err("INTERNAL_ERROR", "Conversion record missing.", {
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
    return ok(
      buildSuccess(existing.conversion, account.givingBalance, account.receivedBalance),
    );
  }

  try {
    const result = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx) => {
          const deduct = await tx.pointAccount.updateMany({
            where: {
              userId: user.id,
              receivedBalance: { gte: data.amount },
            },
            data: {
              receivedBalance: { decrement: data.amount },
              givingBalance: { increment: data.amount },
            },
          });

          if (deduct.count !== 1) {
            throw new InsufficientReceivedError();
          }

          const now = new Date();
          const transaction = await tx.pointTransaction.create({
            data: {
              kind: "CONVERSION",
              actorUserId: user.id,
              idempotencyScope,
              idempotencyKey: data.requestId,
              requestHash,
              createdAt: now,
            },
          });

          const conversion = await tx.conversion.create({
            data: {
              transactionId: transaction.id,
              userId: user.id,
              amount: data.amount,
              createdAt: now,
            },
          });

          await tx.pointEntry.createMany({
            data: [
              {
                transactionId: transaction.id,
                userId: user.id,
                bucket: "RECEIVED",
                delta: -data.amount,
                createdAt: now,
              },
              {
                transactionId: transaction.id,
                userId: user.id,
                bucket: "GIVING",
                delta: data.amount,
                createdAt: now,
              },
            ],
          });

          const account = await tx.pointAccount.findUniqueOrThrow({
            where: { userId: user.id },
          });

          return { conversion, account };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );

    logOperation("info", "Points converted", {
      operation: "convertReceivedPoints",
      correlationId,
      userId: user.id,
      amount: data.amount,
    });

    return ok(
      buildSuccess(
        result.conversion,
        result.account.givingBalance,
        result.account.receivedBalance,
      ),
    );
  } catch (error) {
    if (error instanceof InsufficientReceivedError) {
      return err(
        "INSUFFICIENT_RECEIVED_POINTS",
        "Not enough received points to convert.",
        { correlationId },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const replay = await prisma.pointTransaction.findUnique({
        where: {
          idempotencyScope_kind_idempotencyKey: {
            idempotencyScope,
            kind: "CONVERSION",
            idempotencyKey: data.requestId,
          },
        },
        include: { conversion: true },
      });
      if (replay?.conversion && replay.requestHash === requestHash) {
        const account = await prisma.pointAccount.findUnique({
          where: { userId: user.id },
        });
        if (account) {
          return ok(
            buildSuccess(
              replay.conversion,
              account.givingBalance,
              account.receivedBalance,
            ),
          );
        }
      }
      return err(
        "IDEMPOTENCY_CONFLICT",
        "This request ID was already used with different input.",
        { correlationId },
      );
    }

    logOperation("error", "Conversion failed", {
      operation: "convertReceivedPoints",
      correlationId,
      userId: user.id,
    });

    return err("INTERNAL_ERROR", "Unable to convert points.", {
      correlationId,
    });
  }
}

class InsufficientReceivedError extends Error {
  constructor() {
    super("Insufficient received points");
  }
}

function buildSuccess(
  conversion: {
    id: string;
    transactionId: string;
    amount: number;
    createdAt: Date;
  },
  givingBalance: number,
  receivedBalance: number,
): ConvertReceivedPointsData {
  return {
    conversionId: conversion.id,
    transactionId: conversion.transactionId,
    amount: conversion.amount,
    givingBalance,
    receivedBalance,
    createdAt: conversion.createdAt.toISOString(),
  };
}
