import type { AchievementMetric } from "./rules";

export type RecognitionAchievementFact = {
  senderId: string;
  pointsPerRecipient: number;
  recipientIds: string[];
};

export type AchievementAmounts = {
  sent: number;
  received: number;
  total: number;
};

export function calculateAchievementAmounts(
  userIds: string[],
  recognitions: RecognitionAchievementFact[],
): Map<string, AchievementAmounts> {
  const amounts = new Map(
    userIds.map((userId) => [
      userId,
      { sent: 0, received: 0, total: 0 } satisfies AchievementAmounts,
    ]),
  );

  for (const recognition of recognitions) {
    const sender = amounts.get(recognition.senderId);
    if (sender) {
      sender.sent +=
        recognition.pointsPerRecipient * recognition.recipientIds.length;
    }

    for (const recipientId of recognition.recipientIds) {
      const recipient = amounts.get(recipientId);
      if (recipient) recipient.received += recognition.pointsPerRecipient;
    }
  }

  for (const amount of amounts.values()) {
    amount.total = amount.sent + amount.received;
  }

  return amounts;
}

export type AchievementRankCandidate = {
  userId: string;
  amount: number;
};

export type RankedAchievement = AchievementRankCandidate & {
  rank: number;
};

export function applyAchievementDenseRank(
  entries: AchievementRankCandidate[],
): RankedAchievement[] {
  const sorted = [...entries].sort(
    (a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId),
  );
  let rank = 0;
  let previousAmount: number | null = null;

  return sorted.map((entry) => {
    if (previousAmount === null || entry.amount !== previousAmount) {
      rank += 1;
      previousAmount = entry.amount;
    }
    return { ...entry, rank };
  });
}

export function getMetricAmount(
  amounts: AchievementAmounts,
  metric: AchievementMetric,
): number {
  return amounts[metric];
}
