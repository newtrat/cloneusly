"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import type { LeaderboardView } from "@/lib/dal/leaderboard";

type LeaderboardFiltersProps = {
  period: "day" | "week" | "month";
  hashtag?: string;
};

export function LeaderboardFilters({ period, hashtag = "" }: LeaderboardFiltersProps) {
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
    <div className="space-y-4 rounded-lg border border-border bg-white p-4">
      <div role="tablist" aria-label="Leaderboard period" className="flex flex-wrap gap-2">
        {periods.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={period === p.value}
            disabled={isPending}
            onClick={() => setPeriod(p.value)}
            className={`rounded-md px-4 py-2 text-sm ${
              period === p.value
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleHashtagSubmit} className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="leaderboard-hashtag" className="mb-1 block text-sm font-medium">
            Hashtag filter (optional)
          </label>
          <input
            id="leaderboard-hashtag"
            name="hashtag"
            type="text"
            defaultValue={hashtag}
            disabled={isPending}
            placeholder="teamwork"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          Apply
        </button>
      </form>
    </div>
  );
}

type LeaderboardListProps = {
  data: LeaderboardView;
};

export function LeaderboardList({ data }: LeaderboardListProps) {
  if (data.entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-muted-foreground" role="status">
        No recognition in this window
        {data.hashtag ? ` for #${data.hashtag}` : ""}.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border rounded-lg border border-border bg-white" aria-label="Leaderboard rankings">
      {data.entries.map((entry) => (
        <li key={entry.user.id} className="flex items-center gap-4 px-4 py-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
            aria-label={`Rank ${entry.rank}`}
          >
            {entry.rank}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/people/${entry.user.id}`}
              className="font-semibold hover:text-primary"
            >
              {entry.user.name}
            </Link>
            <span className="text-muted-foreground"> @{entry.user.handle}</span>
          </div>
          <span className="shrink-0 font-semibold text-primary">
            {entry.pointsReceived} pts
          </span>
        </li>
      ))}
    </ol>
  );
}
