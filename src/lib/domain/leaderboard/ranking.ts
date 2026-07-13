export type LeaderboardPeriod = "day" | "week" | "month";

const PERIOD_MS: Record<LeaderboardPeriod, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export function getWindowStart(asOf: Date, period: LeaderboardPeriod): Date {
  return new Date(asOf.getTime() - PERIOD_MS[period]);
}

export type LeaderboardCandidate = {
  userId: string;
  pointsReceived: number;
};

export type RankedLeaderboardEntry = LeaderboardCandidate & {
  rank: number;
};

export function applyDenseRank(
  entries: LeaderboardCandidate[],
): RankedLeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.pointsReceived !== a.pointsReceived) {
      return b.pointsReceived - a.pointsReceived;
    }
    return a.userId.localeCompare(b.userId);
  });

  let rank = 0;
  let previousPoints: number | null = null;

  return sorted.map((entry) => {
    if (previousPoints === null || entry.pointsReceived !== previousPoints) {
      rank += 1;
      previousPoints = entry.pointsReceived;
    }
    return { ...entry, rank };
  });
}
