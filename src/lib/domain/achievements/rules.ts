export const ACHIEVEMENT_METRICS = ["sent", "received", "total"] as const;
export type AchievementMetric = (typeof ACHIEVEMENT_METRICS)[number];

export const ACHIEVEMENT_PERIODS = ["allTime", "month"] as const;
export type AchievementPeriod = (typeof ACHIEVEMENT_PERIODS)[number];

export const ACHIEVEMENT_TIERS = [
  "Stone",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
] as const;
export type AchievementTier = (typeof ACHIEVEMENT_TIERS)[number];

type TierThresholds = Record<AchievementTier, number>;

const STANDARD_MONTH_THRESHOLDS: TierThresholds = {
  Stone: 1,
  Bronze: 25,
  Silver: 50,
  Gold: 100,
  Platinum: 200,
  Diamond: 500,
};

const STANDARD_ALL_TIME_THRESHOLDS: TierThresholds = {
  Stone: 1,
  Bronze: 100,
  Silver: 250,
  Gold: 500,
  Platinum: 1_000,
  Diamond: 2_500,
};

export const ACHIEVEMENT_THRESHOLDS: Record<
  AchievementPeriod,
  Record<AchievementMetric, TierThresholds>
> = {
  month: {
    sent: STANDARD_MONTH_THRESHOLDS,
    received: STANDARD_MONTH_THRESHOLDS,
    total: {
      Stone: 1,
      Bronze: 50,
      Silver: 100,
      Gold: 200,
      Platinum: 400,
      Diamond: 1_000,
    },
  },
  allTime: {
    sent: STANDARD_ALL_TIME_THRESHOLDS,
    received: STANDARD_ALL_TIME_THRESHOLDS,
    total: {
      Stone: 1,
      Bronze: 200,
      Silver: 500,
      Gold: 1_000,
      Platinum: 2_000,
      Diamond: 5_000,
    },
  },
};

export type AchievementProgress = {
  tier: AchievementTier | null;
  amount: number;
  currentThreshold: number;
  nextTier: AchievementTier | null;
  nextThreshold: number | null;
  progressPercent: number;
};

export function getAchievementProgress(
  amount: number,
  metric: AchievementMetric,
  period: AchievementPeriod,
): AchievementProgress {
  const safeAmount = Math.max(0, amount);
  const thresholds = ACHIEVEMENT_THRESHOLDS[period][metric];
  let tier: AchievementTier | null = null;

  for (const candidate of ACHIEVEMENT_TIERS) {
    if (safeAmount < thresholds[candidate]) break;
    tier = candidate;
  }

  const tierIndex = tier === null ? -1 : ACHIEVEMENT_TIERS.indexOf(tier);
  const nextTier = ACHIEVEMENT_TIERS[tierIndex + 1] ?? null;
  const currentThreshold = tier === null ? 0 : thresholds[tier];
  const nextThreshold = nextTier === null ? null : thresholds[nextTier];
  const progressPercent =
    nextThreshold === null
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            ((safeAmount - currentThreshold) /
              (nextThreshold - currentThreshold)) *
              100,
          ),
        );

  return {
    tier,
    amount: safeAmount,
    currentThreshold,
    nextTier,
    nextThreshold,
    progressPercent,
  };
}
