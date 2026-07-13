export default function LeaderboardLoading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <p className="text-muted-foreground">Loading leaderboard…</p>
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
