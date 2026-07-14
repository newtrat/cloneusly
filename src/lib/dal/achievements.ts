import "server-only";

import { requireActiveUser } from "@/lib/auth/require-user";
import { toUserSummary, type UserSummary } from "@/lib/dal/current-user";
import {
  getCalendarMonthRange,
  getCompanyMonthKey,
  parseMonthKey,
} from "@/lib/domain/achievements/calendar";
import {
  applyAchievementDenseRank,
  calculateAchievementAmounts,
  getMetricAmount,
} from "@/lib/domain/achievements/ranking";
import {
  ACHIEVEMENT_METRICS,
  getAchievementProgress,
  type AchievementMetric,
  type AchievementPeriod,
  type AchievementProgress,
} from "@/lib/domain/achievements/rules";
import { ok, type CommandResult } from "@/lib/domain/result";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type AchievementSummary = AchievementProgress & {
  metric: AchievementMetric;
};

export type AchievementRankingEntry = AchievementProgress & {
  rank: number;
  user: UserSummary;
  isViewer: boolean;
};

export type AchievementLeaderboardView = {
  period: AchievementPeriod;
  monthKey: string | null;
  currentMonthKey: string;
  metric: AchievementMetric;
  asOf: string;
  viewerAchievements: AchievementSummary[];
  entries: AchievementRankingEntry[];
};

export type GetAchievementLeaderboardInput = {
  period: AchievementPeriod;
  metric: AchievementMetric;
  monthKey?: string;
  asOf?: Date;
};

export async function getAchievementLeaderboard(
  input: GetAchievementLeaderboardInput,
): Promise<CommandResult<AchievementLeaderboardView>> {
  const authResult = await requireActiveUser();
  if (!authResult.ok) return authResult;

  const asOf = input.asOf ?? new Date();
  const timeZone = getEnv().COMPANY_TIME_ZONE;
  const currentMonthKey = getCompanyMonthKey(asOf, timeZone);
  const requestedMonth =
    input.monthKey &&
    parseMonthKey(input.monthKey) &&
    input.monthKey <= currentMonthKey
      ? input.monthKey
      : currentMonthKey;
  const monthKey = input.period === "month" ? requestedMonth : null;

  const range =
    monthKey === null ? null : getCalendarMonthRange(monthKey, timeZone);
  const isCurrentMonth = monthKey !== null && monthKey === currentMonthKey;

  const [users, recognitions] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, handle: true, name: true, image: true },
    }),
    prisma.recognition.findMany({
      where:
        range === null
          ? { createdAt: { lte: asOf } }
          : {
              createdAt: {
                gte: range.start,
                ...(isCurrentMonth ? { lte: asOf } : { lt: range.end }),
              },
            },
      select: {
        senderId: true,
        pointsPerRecipient: true,
        recipients: { select: { recipientId: true } },
      },
    }),
  ]);

  const amountsByUser = calculateAchievementAmounts(
    users.map((user) => user.id),
    recognitions.map((recognition) => ({
      senderId: recognition.senderId,
      pointsPerRecipient: recognition.pointsPerRecipient,
      recipientIds: recognition.recipients.map(
        (recipient) => recipient.recipientId,
      ),
    })),
  );
  const period = input.period;
  const viewerAmounts = amountsByUser.get(authResult.data.id) ?? {
    sent: 0,
    received: 0,
    total: 0,
  };
  const viewerAchievements = ACHIEVEMENT_METRICS.map((metric) => ({
    metric,
    ...getAchievementProgress(viewerAmounts[metric], metric, period),
  }));
  const userMap = new Map(users.map((user) => [user.id, user]));
  const ranked = applyAchievementDenseRank(
    users.map((user) => ({
      userId: user.id,
      amount: getMetricAmount(
        amountsByUser.get(user.id) ?? { sent: 0, received: 0, total: 0 },
        input.metric,
      ),
    })),
  );

  const entries = ranked.flatMap((entry) => {
    const user = userMap.get(entry.userId);
    if (!user) return [];
    return [
      {
        rank: entry.rank,
        user: toUserSummary(user),
        isViewer: entry.userId === authResult.data.id,
        ...getAchievementProgress(entry.amount, input.metric, period),
      },
    ];
  });

  return ok({
    period,
    monthKey,
    currentMonthKey,
    metric: input.metric,
    asOf: asOf.toISOString(),
    viewerAchievements,
    entries,
  });
}
