import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading leaderboard"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Card size="sm">
        <CardContent className="space-y-5">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <div className="space-y-px">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-16 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading leaderboard…</span>
    </div>
  );
}
