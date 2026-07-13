import { Suspense } from "react";

import {
  LeaderboardFilters,
  LeaderboardList,
} from "@/components/leaderboard/leaderboard-list";
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
        <p className="mt-1 text-sm text-muted-foreground">
          Rolling recognition rankings by points received.
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
        <LeaderboardFilters period={period} hashtag={hashtag ?? ""} />
      </Suspense>

      {result.ok ? (
        <>
          <p className="text-xs text-muted-foreground">
            Window: {new Date(result.data.windowStart).toLocaleString()} –{" "}
            {new Date(result.data.asOf).toLocaleString()}
          </p>
          <LeaderboardList data={result.data} />
        </>
      ) : (
        <p role="alert" className="text-destructive">
          {result.error.message}
        </p>
      )}
    </div>
  );
}
