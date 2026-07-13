import "server-only";

import { requireActiveUser } from "@/lib/auth/require-user";
import { toUserSummary, type UserSummary } from "@/lib/dal/current-user";
import { ok, type CommandResult } from "@/lib/domain/result";
import {
  applyDenseRank,
  getWindowStart,
  type LeaderboardPeriod,
} from "@/lib/domain/leaderboard/ranking";
import { prisma } from "@/lib/prisma";

export type LeaderboardView = {
  period: LeaderboardPeriod;
  hashtag: string | null;
  asOf: string;
  windowStart: string;
  entries: Array<{
    rank: number;
    user: UserSummary;
    pointsReceived: number;
  }>;
};

export type GetLeaderboardInput = {
  period: LeaderboardPeriod;
  hashtag?: string;
  limit?: number;
  asOf?: Date;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function getLeaderboard(
  input: GetLeaderboardInput,
): Promise<CommandResult<LeaderboardView>> {
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const asOf = input.asOf ?? new Date();
  const windowStart = getWindowStart(asOf, input.period);
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  let normalizedHashtag: string | null = null;
  if (input.hashtag) {
    normalizedHashtag = input.hashtag.trim().replace(/^#/, "").toLowerCase();
    const exists = await prisma.hashtag.findUnique({
      where: { normalizedName: normalizedHashtag },
    });
    if (!exists) {
      return ok({
        period: input.period,
        hashtag: normalizedHashtag,
        asOf: asOf.toISOString(),
        windowStart: windowStart.toISOString(),
        entries: [],
      });
    }
  }

  const recipients = await prisma.recognitionRecipient.findMany({
    where: {
      createdAt: { gte: windowStart, lte: asOf },
      ...(normalizedHashtag
        ? {
            recognition: {
              hashtags: {
                some: {
                  hashtag: { normalizedName: normalizedHashtag },
                },
              },
            },
          }
        : {}),
    },
    select: {
      recipientId: true,
      recognition: { select: { pointsPerRecipient: true } },
    },
  });

  const totals = new Map<string, number>();
  for (const row of recipients) {
    totals.set(
      row.recipientId,
      (totals.get(row.recipientId) ?? 0) + row.recognition.pointsPerRecipient,
    );
  }

  const candidates = [...totals.entries()].map(([userId, pointsReceived]) => ({
    userId,
    pointsReceived,
  }));

  const ranked = applyDenseRank(candidates).slice(0, limit);
  const userIds = ranked.map((e) => e.userId);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, handle: true, name: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const entries = ranked
    .map((entry) => {
      const user = userMap.get(entry.userId);
      if (!user) return null;
      return {
        rank: entry.rank,
        user: toUserSummary(user),
        pointsReceived: entry.pointsReceived,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return ok({
    period: input.period,
    hashtag: normalizedHashtag,
    asOf: asOf.toISOString(),
    windowStart: windowStart.toISOString(),
    entries,
  });
}

export { getWindowStart, applyDenseRank };
