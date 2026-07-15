"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { LeaderboardView } from "@/lib/dal/leaderboard";

type LeaderboardFiltersProps = {
  period: "day" | "week" | "month";
  hashtag?: string;
};

export function LeaderboardFilters({
  period,
  hashtag = "",
}: LeaderboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setPeriod(next: "day" | "week" | "month") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", next);
    startTransition(() => router.push(`/leaderboard?${params.toString()}`));
  }

  function handleHashtagSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const value = new FormData(form).get("hashtag")?.toString().trim() ?? "";
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("hashtag", value.replace(/^#/, ""));
    else params.delete("hashtag");
    startTransition(() => router.push(`/leaderboard?${params.toString()}`));
  }

  const periods: Array<{ value: "day" | "week" | "month"; label: string }> = [
    { value: "day", label: "24 hours" },
    { value: "week", label: "7 days" },
    { value: "month", label: "30 days" },
  ];

  return (
    <Card size="sm">
      <CardContent className="space-y-5">
        <div
          role="tablist"
          aria-label="Leaderboard period"
          className="bg-muted grid grid-cols-3 p-1 sm:inline-grid"
        >
          {periods.map((p) => (
            <Button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={period === p.value}
              disabled={isPending}
              onClick={() => setPeriod(p.value)}
              variant={period === p.value ? "default" : "ghost"}
              size="sm"
              className="px-2 sm:px-4"
            >
              {p.label}
            </Button>
          ))}
        </div>

        <Separator />

        <form
          onSubmit={handleHashtagSubmit}
          className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Label htmlFor="leaderboard-hashtag" className="mb-1.5">
              Hashtag filter (optional)
            </Label>
            <Input
              id="leaderboard-hashtag"
              name="hashtag"
              type="text"
              defaultValue={hashtag}
              disabled={isPending}
              placeholder="teamwork"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            Apply
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

type LeaderboardListProps = {
  data: LeaderboardView;
};

export function LeaderboardList({ data }: LeaderboardListProps) {
  if (data.entries.length === 0) {
    return (
      <Card className="border border-dashed shadow-none" role="status">
        <CardContent className="text-muted-foreground py-8 text-center">
          No recognition in this window
          {data.hashtag ? ` for #${data.hashtag}` : ""}.
        </CardContent>
      </Card>
    );
  }

  return (
    <ol
      className="bg-card ring-foreground/5 overflow-hidden shadow-sm ring-1"
      aria-label="Leaderboard rankings"
    >
      {data.entries.map((entry, index) => (
        <li key={entry.user.id}>
          <div className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6">
            <Badge
              variant={entry.rank <= 3 ? "default" : "secondary"}
              className="w-8 justify-center text-xs"
              aria-label={`Rank ${entry.rank}`}
            >
              {entry.rank}
            </Badge>
            <div className="min-w-0 flex-1">
              <Link
                href={`/people/${entry.user.id}`}
                className="hover:text-primary block truncate font-semibold"
              >
                {entry.user.name}
              </Link>
              <span className="text-muted-foreground block truncate text-sm">
                @{entry.user.handle}
              </span>
            </div>
            <span className="text-primary shrink-0 font-semibold">
              {entry.pointsReceived} pts
            </span>
          </div>
          {index < data.entries.length - 1 ? <Separator /> : null}
        </li>
      ))}
    </ol>
  );
}
