import "server-only";

import type { Prisma } from "@prisma/client";

import { requireActiveUser } from "@/lib/auth/require-user";
import { toUserSummary, type UserSummary } from "@/lib/dal/current-user";
import { decodeFeedCursor, encodeFeedCursor } from "@/lib/dal/cursor";
import type { CursorPage } from "@/lib/dal/cursor";
import { toRecognitionCardView, type RecognitionCardView } from "@/lib/dal/recognition-feed";
import { err, ok, type CommandResult } from "@/lib/domain/result";
import { prisma } from "@/lib/prisma";

export type UserActivityView = {
  user: UserSummary;
  sent: CursorPage<RecognitionCardView>;
  received: CursorPage<RecognitionCardView>;
};

export type GetUserActivityInput = {
  userId: string;
  sentCursor?: string;
  receivedCursor?: string;
  limit?: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function getUserActivity(
  input: GetUserActivityInput,
): Promise<CommandResult<UserActivityView>> {
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const user = await prisma.user.findFirst({
    where: { id: input.userId, status: "ACTIVE" },
    select: { id: true, handle: true, name: true, image: true },
  });

  if (!user) {
    return err("RECIPIENT_NOT_FOUND", "User not found.");
  }

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const currentUserId = authResult.data.id;

  const [sent, received] = await Promise.all([
    fetchSentActivity(input.userId, currentUserId, input.sentCursor, limit),
    fetchReceivedActivity(
      input.userId,
      currentUserId,
      input.receivedCursor,
      limit,
    ),
  ]);

  return ok({
    user: toUserSummary(user),
    sent,
    received,
  });
}

async function fetchSentActivity(
  userId: string,
  currentUserId: string,
  cursor: string | undefined,
  limit: number,
): Promise<CursorPage<RecognitionCardView>> {
  const where: Prisma.RecognitionWhereInput = { senderId: userId };
  applyCursor(where, cursor);

  const rows = await fetchRecognitionPage(where, limit);
  return mapPage(rows, currentUserId, limit);
}

async function fetchReceivedActivity(
  userId: string,
  currentUserId: string,
  cursor: string | undefined,
  limit: number,
): Promise<CursorPage<RecognitionCardView>> {
  const where: Prisma.RecognitionWhereInput = {
    recipients: { some: { recipientId: userId } },
  };
  applyCursor(where, cursor);

  const rows = await fetchRecognitionPage(where, limit);
  return mapPage(rows, currentUserId, limit);
}

function applyCursor(
  where: Prisma.RecognitionWhereInput,
  cursor: string | undefined,
): void {
  if (!cursor) return;
  const decoded = decodeFeedCursor(cursor);
  if (!decoded) return;
  where.AND = [
    {
      OR: [
        { createdAt: { lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, id: { lt: decoded.id } },
      ],
    },
  ];
}

async function fetchRecognitionPage(
  where: Prisma.RecognitionWhereInput,
  limit: number,
) {
  return prisma.recognition.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      sender: {
        select: { id: true, handle: true, name: true, image: true },
      },
      recipients: {
        include: {
          recipient: {
            select: { id: true, handle: true, name: true, image: true },
          },
        },
      },
      hashtags: { include: { hashtag: true } },
      reactions: true,
      comments: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 50,
        include: {
          author: {
            select: { id: true, handle: true, name: true, image: true },
          },
        },
      },
    },
  });
}

function mapPage(
  rows: Awaited<ReturnType<typeof fetchRecognitionPage>>,
  currentUserId: string,
  limit: number,
): CursorPage<RecognitionCardView> {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  return {
    items: page.map((r) => toRecognitionCardView(r, currentUserId)),
    nextCursor:
      hasMore && last ? encodeFeedCursor(last.createdAt, last.id) : null,
  };
}
