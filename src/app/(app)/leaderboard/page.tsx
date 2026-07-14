import { Suspense } from "react";

import { AchievementSection } from "@/components/achievements/achievement-section";
import {
  LeaderboardFilters,
  LeaderboardList,
} from "@/components/leaderboard/leaderboard-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getAchievementLeaderboard } from "@/lib/dal/achievements";
import { getLeaderboard } from "@/lib/dal/leaderboard";
import type {
  AchievementMetric,
  AchievementPeriod,
} from "@/lib/domain/achievements/rules";

type LeaderboardPageProps = {
  searchParams: Promise<{
    period?: string;
    hashtag?: string;
    achievementPeriod?: string;
    metric?: string;
    month?: string;
  }>;
};

function parsePeriod(value: string | undefined): "day" | "week" | "month" {
  if (value === "week" || value === "month") return value;
  return "day";
}

function parseAchievementPeriod(value: string | undefined): AchievementPeriod {
  return value === "allTime" ? "allTime" : "month";
}

function parseAchievementMetric(value: string | undefined): AchievementMetric {
  if (value === "sent" || value === "received") return value;
  return "total";
}

export default async function LeaderboardPage({
  searchParams,
}: LeaderboardPageProps) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const hashtag = params.hashtag;
  const achievementPeriod = parseAchievementPeriod(params.achievementPeriod);
  const achievementMetric = parseAchievementMetric(params.metric);

  const [achievementResult, leaderboardResult] = await Promise.all([
    getAchievementLeaderboard({
      period: achievementPeriod,
      metric: achievementMetric,
      monthKey: params.month,
    }),
    getLeaderboard({ period, hashtag }),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Earn achievement tiers and compare recognition across the company.
        </p>
      </header>

      {achievementResult.ok ? (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <AchievementSection data={achievementResult.data} />
        </Suspense>
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Unable to load achievements</AlertTitle>
          <AlertDescription>{achievementResult.error.message}</AlertDescription>
        </Alert>
      )}

      <section
        className="space-y-5"
        aria-labelledby="rolling-leaderboard-heading"
      >
        <div>
          <h2
            id="rolling-leaderboard-heading"
            className="text-xl font-semibold"
          >
            Rolling recognition leaderboard
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Recent rankings by points received, optionally filtered by hashtag.
          </p>
        </div>

        <Suspense
          fallback={
            <div role="status" aria-label="Loading leaderboard filters">
              <Skeleton className="h-32 w-full" />
            </div>
          }
        >
          <LeaderboardFilters period={period} hashtag={hashtag ?? ""} />
        </Suspense>

        {leaderboardResult.ok ? (
          <>
            <p className="text-muted-foreground text-xs">
              Window:{" "}
              {new Date(leaderboardResult.data.windowStart).toLocaleString()} –{" "}
              {new Date(leaderboardResult.data.asOf).toLocaleString()}
            </p>
            <LeaderboardList data={leaderboardResult.data} />
          </>
        ) : (
          <Alert variant="destructive">
            <AlertTitle>Unable to load rolling leaderboard</AlertTitle>
            <AlertDescription>
              {leaderboardResult.error.message}
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}
