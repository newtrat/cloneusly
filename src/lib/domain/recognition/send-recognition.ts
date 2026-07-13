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
import { normalizeHashtags } from "@/lib/domain/recognition/normalize-hashtags";
import { prisma } from "@/lib/prisma";
import {
  computeTotalCost,
  hasDuplicateStrings,
} from "@/lib/validation/common";
import {
  parseSendRecognitionInput,
} from "@/lib/validation/recognition";

export type SendRecognitionData = {
  recognitionId: string;
  transactionId: string;
  totalCost: number;
  givingBalance: number;
  recipients: Array<{
    userId: string;
    pointsReceived: number;
  }>;
  createdAt: string;
};

export async function sendRecognition(
  input: unknown,
): Promise<CommandResult<SendRecognitionData>> {
  const correlationId = createCorrelationId();
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const sender = authResult.data;
  const parsed = parseSendRecognitionInput(input);
  if (!parsed.ok) {
    return err("VALIDATION_ERROR", "Invalid recognition input.", {
      fieldErrors: parsed.fieldErrors,
      correlationId,
    });
  }

  const data = parsed.data;

  if (data.recipientIds.includes(sender.id)) {
    return err("SELF_RECOGNITION", "You cannot recognize yourself.", {
      correlationId,
    });
  }

  if (hasDuplicateStrings(data.recipientIds)) {
    return err("DUPLICATE_RECIPIENT", "Duplicate recipients are not allowed.", {
      correlationId,
    });
  }

  const totalCost = computeTotalCost(
    data.pointsPerRecipient,
    data.recipientIds.length,
  );
  if (totalCost === null) {
    return err("VALIDATION_ERROR", "Total cost exceeds safe integer limit.", {
      correlationId,
    });
  }

  const requestHash = hashRequestInput({
    recipientIds: [...data.recipientIds].sort(),
    pointsPerRecipient: data.pointsPerRecipient,
    text: data.text ?? null,
    gifUrl: data.gifUrl ?? null,
    hashtags: normalizeHashtags(data.hashtags ?? []).map((h) => h.normalizedName),
  });

  const idempotencyScope = userIdempotencyScope(sender.id);

  const existing = await prisma.pointTransaction.findUnique({
    where: {
      idempotencyScope_kind_idempotencyKey: {
        idempotencyScope,
        kind: "RECOGNITION",
        idempotencyKey: data.requestId,
      },
    },
    include: {
      recognition: {
        include: {
          recipients: true,
        },
      },
    },
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      return err(
        "IDEMPOTENCY_CONFLICT",
        "This request ID was already used with different input.",
        { correlationId },
      );
    }
    if (!existing.recognition) {
      return err("INTERNAL_ERROR", "Recognition record missing.", {
        correlationId,
      });
    }

    const account = await prisma.pointAccount.findUnique({
      where: { userId: sender.id },
    });
    if (!account) {
      return err("INTERNAL_ERROR", "Point account not found.", {
        correlationId,
      });
    }

    return ok(buildSuccess(existing.recognition, account.givingBalance));
  }

  const hashtags = normalizeHashtags(data.hashtags ?? []);

  try {
    const result = await withSerializableRetry(async () =>
      prisma.$transaction(
        async (tx) => {
          const recipients = await tx.user.findMany({
            where: {
              id: { in: data.recipientIds },
              status: "ACTIVE",
            },
          });

          if (recipients.length !== data.recipientIds.length) {
            throw new RecipientNotFoundError();
          }

          const deduct = await tx.pointAccount.updateMany({
            where: {
              userId: sender.id,
              givingBalance: { gte: totalCost },
            },
            data: {
              givingBalance: { decrement: totalCost },
            },
          });

          if (deduct.count !== 1) {
            throw new InsufficientPointsError();
          }

          const now = new Date();

          const transaction = await tx.pointTransaction.create({
            data: {
              kind: "RECOGNITION",
              actorUserId: sender.id,
              idempotencyScope,
              idempotencyKey: data.requestId,
              requestHash,
              createdAt: now,
            },
          });

          const recognition = await tx.recognition.create({
            data: {
              transactionId: transaction.id,
              senderId: sender.id,
              pointsPerRecipient: data.pointsPerRecipient,
              text: data.text ?? null,
              gifUrl: data.gifUrl ?? null,
              createdAt: now,
            },
          });

          await tx.recognitionRecipient.createMany({
            data: data.recipientIds.map((recipientId) => ({
              recognitionId: recognition.id,
              recipientId,
              createdAt: now,
            })),
          });

          for (const tag of hashtags) {
            const hashtag = await tx.hashtag.upsert({
              where: { normalizedName: tag.normalizedName },
              create: {
                normalizedName: tag.normalizedName,
                displayName: tag.displayName,
              },
              update: {},
            });

            await tx.recognitionHashtag.create({
              data: {
                recognitionId: recognition.id,
                hashtagId: hashtag.id,
              },
            });
          }

          await tx.pointEntry.create({
            data: {
              transactionId: transaction.id,
              userId: sender.id,
              bucket: "GIVING",
              delta: -totalCost,
              createdAt: now,
            },
          });

          for (const recipientId of data.recipientIds) {
            await tx.pointEntry.create({
              data: {
                transactionId: transaction.id,
                userId: recipientId,
                bucket: "RECEIVED",
                delta: data.pointsPerRecipient,
                createdAt: now,
              },
            });

            await tx.pointAccount.update({
              where: { userId: recipientId },
              data: {
                receivedBalance: { increment: data.pointsPerRecipient },
              },
            });

            await tx.notification.create({
              data: {
                userId: recipientId,
                type: "RECOGNITION_RECEIVED",
                recognitionId: recognition.id,
                actorUserId: sender.id,
                eventKey: `${recognition.id}:${recipientId}`,
              },
            });
          }

          const updatedAccount = await tx.pointAccount.findUniqueOrThrow({
            where: { userId: sender.id },
          });

          const fullRecognition = await tx.recognition.findUniqueOrThrow({
            where: { id: recognition.id },
            include: { recipients: true },
          });

          return {
            recognition: fullRecognition,
            givingBalance: updatedAccount.givingBalance,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );

    logOperation("info", "Recognition sent", {
      operation: "sendRecognition",
      correlationId,
      userId: sender.id,
      recognitionId: result.recognition.id,
      recipientCount: data.recipientIds.length,
      totalCost,
    });

    return ok(buildSuccess(result.recognition, result.givingBalance));
  } catch (error) {
    if (error instanceof RecipientNotFoundError) {
      return err("RECIPIENT_NOT_FOUND", "One or more recipients were not found.", {
        correlationId,
      });
    }
    if (error instanceof InsufficientPointsError) {
      return err(
        "INSUFFICIENT_GIVING_POINTS",
        "Not enough giving points for this recognition.",
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
            kind: "RECOGNITION",
            idempotencyKey: data.requestId,
          },
        },
        include: {
          recognition: { include: { recipients: true } },
        },
      });
      if (replay?.recognition && replay.requestHash === requestHash) {
        const account = await prisma.pointAccount.findUnique({
          where: { userId: sender.id },
        });
        if (account) {
          return ok(buildSuccess(replay.recognition, account.givingBalance));
        }
      }
      return err(
        "IDEMPOTENCY_CONFLICT",
        "This request ID was already used with different input.",
        { correlationId },
      );
    }

    logOperation("error", "Recognition send failed", {
      operation: "sendRecognition",
      correlationId,
      userId: sender.id,
    });

    return err("INTERNAL_ERROR", "Unable to send recognition.", {
      correlationId,
    });
  }
}

class RecipientNotFoundError extends Error {
  constructor() {
    super("Recipient not found");
  }
}

class InsufficientPointsError extends Error {
  constructor() {
    super("Insufficient giving points");
  }
}

function buildSuccess(
  recognition: {
    id: string;
    transactionId: string;
    pointsPerRecipient: number;
    createdAt: Date;
    recipients: Array<{ recipientId: string }>;
  },
  givingBalance: number,
): SendRecognitionData {
  return {
    recognitionId: recognition.id,
    transactionId: recognition.transactionId,
    totalCost: recognition.pointsPerRecipient * recognition.recipients.length,
    givingBalance,
    recipients: recognition.recipients.map((r) => ({
      userId: r.recipientId,
      pointsReceived: recognition.pointsPerRecipient,
    })),
    createdAt: recognition.createdAt.toISOString(),
  };
}
