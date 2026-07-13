import "server-only";

import { requireActiveUser } from "@/lib/auth/require-user";
import { toUserSummary, type UserSummary } from "@/lib/dal/current-user";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  type CursorPage,
} from "@/lib/dal/cursor";
import { ok, type CommandResult } from "@/lib/domain/result";
import { prisma } from "@/lib/prisma";

export type NotificationView = {
  id: string;
  type: "RECOGNITION_RECEIVED" | "RECOGNITION_REACTION" | "RECOGNITION_COMMENT";
  recognitionId: string;
  actor: UserSummary;
  createdAt: string;
  readAt: string | null;
};

export type GetNotificationsInput = {
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function getNotifications(
  input: GetNotificationsInput = {},
): Promise<CommandResult<CursorPage<NotificationView>>> {
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const userId = authResult.data.id;
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursorFilter = input.cursor ? decodeFeedCursor(input.cursor) : null;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(input.unreadOnly ? { readAt: null } : {}),
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
      actorUser: {
        select: { id: true, handle: true, name: true, image: true },
      },
    },
  });

  const hasMore = notifications.length > limit;
  const page = hasMore ? notifications.slice(0, limit) : notifications;
  const last = page.at(-1);

  return ok({
    items: page.map((n) => ({
      id: n.id,
      type: n.type,
      recognitionId: n.recognitionId,
      actor: toUserSummary(n.actorUser),
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    })),
    nextCursor:
      hasMore && last ? encodeFeedCursor(last.createdAt, last.id) : null,
  });
}

export async function getUnreadNotificationCountForUser(
  userId: string,
): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}
