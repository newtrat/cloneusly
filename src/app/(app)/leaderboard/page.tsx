import { Suspense } from "react";

import {
  LeaderboardFilters,
  LeaderboardList,
} from "@/components/leaderboard/leaderboard-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getLeaderboard } from "@/lib/dal/leaderboard";

type LeaderboardPageProps = {
  searchParams: Promise<{
    period?: string;
    hashtag?: string;
  }>;
};

function parsePeriod(value: string | undefined): "day" | "week" | "month" {
  if (value === "week" || value === "month") return value;
  return "day";
}

export default async function LeaderboardPage({
  searchParams,
}: LeaderboardPageProps) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const hashtag = params.hashtag;

  const result = await getLeaderboard({ period, hashtag });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Rolling recognition rankings by points received.
        </p>
      </header>

      <Suspense
        fallback={
          <div role="status" aria-label="Loading leaderboard filters">
            <Skeleton className="h-32 w-full" />
          </div>
        }
      >
        <LeaderboardFilters period={period} hashtag={hashtag ?? ""} />
      </Suspense>

      {result.ok ? (
        <>
          <p className="text-muted-foreground text-xs">
            Window: {new Date(result.data.windowStart).toLocaleString()} –{" "}
            {new Date(result.data.asOf).toLocaleString()}
          </p>
          <LeaderboardList data={result.data} />
        </>
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Unable to load leaderboard</AlertTitle>
          <AlertDescription>{result.error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
