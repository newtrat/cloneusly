import "server-only";

import { requireActiveUser } from "@/lib/auth/require-user";
import type { UserSummary } from "@/lib/dal/current-user";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  type CursorPage,
} from "@/lib/dal/cursor";
import { ok, type CommandResult } from "@/lib/domain/result";
import { prisma } from "@/lib/prisma";

export type PointHistoryEntry = {
  id: string;
  kind:
    | "RECOGNITION_SENT"
    | "RECOGNITION_RECEIVED"
    | "CONVERSION"
    | "MONTHLY_GRANT"
    | "TEST_TOP_UP";
  label: string;
  amount: number;
  bucket: "GIVING" | "RECEIVED";
  delta: number;
  createdAt: string;
  testActivity: boolean;
};

export type GetPointHistoryInput = {
  cursor?: string;
  limit?: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function getPointHistory(
  input: GetPointHistoryInput = {},
): Promise<CommandResult<CursorPage<PointHistoryEntry>>> {
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const userId = authResult.data.id;
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  const cursorFilter = input.cursor
    ? decodeFeedCursor(input.cursor)
    : null;

  const entries = await prisma.pointEntry.findMany({
    where: {
      userId,
      ...(cursorFilter
        ? {
            OR: [
              { createdAt: { lt: cursorFilter.createdAt } },
              {
                createdAt: cursorFilter.createdAt,
                id: { lt: cursorFilter.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      transaction: {
        include: {
          recognition: {
            include: { sender: true },
          },
          conversion: true,
          monthlyGrant: true,
          testTopUp: true,
        },
      },
    },
  });

  const hasMore = entries.length > limit;
  const page = hasMore ? entries.slice(0, limit) : entries;

  const items = page.map((entry) => mapHistoryEntry(entry, userId));
  const last = page.at(-1);

  return ok({
    items,
    nextCursor:
      hasMore && last ? encodeFeedCursor(last.createdAt, last.id) : null,
  });
}

type EntryWithTransaction = Awaited<
  ReturnType<typeof prisma.pointEntry.findMany>
>[number] & {
  transaction: {
    kind: string;
    recognition: {
      senderId: string;
      pointsPerRecipient: number;
      sender: UserSummary;
    } | null;
    conversion: { amount: number } | null;
    monthlyGrant: { amount: number } | null;
    testTopUp: { amount: number } | null;
  };
};

function mapHistoryEntry(
  entry: EntryWithTransaction,
  userId: string,
): PointHistoryEntry {
  const tx = entry.transaction;

  if (tx.recognition) {
    const isSender = tx.recognition.senderId === userId;
    return {
      id: entry.id,
      kind: isSender ? "RECOGNITION_SENT" : "RECOGNITION_RECEIVED",
      label: isSender
        ? `Recognition sent to colleagues`
        : `Recognition from @${tx.recognition.sender.handle}`,
      amount: tx.recognition.pointsPerRecipient,
      bucket: entry.bucket,
      delta: entry.delta,
      createdAt: entry.createdAt.toISOString(),
      testActivity: false,
    };
  }

  if (tx.conversion) {
    return {
      id: entry.id,
      kind: "CONVERSION",
      label: "Converted received to giving points",
      amount: tx.conversion.amount,
      bucket: entry.bucket,
      delta: entry.delta,
      createdAt: entry.createdAt.toISOString(),
      testActivity: false,
    };
  }

  if (tx.monthlyGrant) {
    return {
      id: entry.id,
      kind: "MONTHLY_GRANT",
      label: "Monthly giving allowance",
      amount: tx.monthlyGrant.amount,
      bucket: entry.bucket,
      delta: entry.delta,
      createdAt: entry.createdAt.toISOString(),
      testActivity: false,
    };
  }

  if (tx.testTopUp) {
    return {
      id: entry.id,
      kind: "TEST_TOP_UP",
      label: "Test top-up (non-production)",
      amount: tx.testTopUp.amount,
      bucket: entry.bucket,
      delta: entry.delta,
      createdAt: entry.createdAt.toISOString(),
      testActivity: true,
    };
  }

  return {
    id: entry.id,
    kind: "CONVERSION",
    label: "Point activity",
    amount: Math.abs(entry.delta),
    bucket: entry.bucket,
    delta: entry.delta,
    createdAt: entry.createdAt.toISOString(),
    testActivity: false,
  };
}
