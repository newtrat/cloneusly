"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type {
  AchievementLeaderboardView,
  AchievementSummary,
} from "@/lib/dal/achievements";
import { shiftMonthKey } from "@/lib/domain/achievements/calendar";
import {
  ACHIEVEMENT_THRESHOLDS,
  ACHIEVEMENT_TIERS,
  type AchievementMetric,
  type AchievementPeriod,
  type AchievementProgress,
  type AchievementTier,
} from "@/lib/domain/achievements/rules";

type AchievementSectionProps = {
  data: AchievementLeaderboardView;
};

const METRIC_LABELS: Record<AchievementMetric, string> = {
  sent: "Sent",
  received: "Received",
  total: "Total",
};

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function AchievementBadge({ progress }: { progress: AchievementProgress }) {
  return (
    <Badge variant={progress.tier ? "default" : "secondary"}>
      {progress.tier ?? "Not earned"}
    </Badge>
  );
}

function ProgressDetails({ progress }: { progress: AchievementProgress }) {
  const description =
    progress.nextTier && progress.nextThreshold
      ? `${progress.nextThreshold - progress.amount} points to ${progress.nextTier}`
      : progress.tier
        ? "Highest tier earned"
        : "Start recognizing teammates to earn Stone";

  return (
    <div className="space-y-2">
      <div
        className="bg-muted h-2 overflow-hidden"
        role="progressbar"
        aria-label="Achievement tier progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.progressPercent)}
      >
        <div
          className="bg-primary h-full transition-[width]"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
  );
}

function PersonalAchievementCard({
  achievement,
}: {
  achievement: AchievementSummary;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{METRIC_LABELS[achievement.metric]}</CardTitle>
        <CardDescription>
          {achievement.metric === "total"
            ? "Points sent and received"
            : `Points ${achievement.metric}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-2xl font-semibold">{achievement.amount}</span>
          <AchievementBadge progress={achievement} />
        </div>
        <ProgressDetails progress={achievement} />
      </CardContent>
    </Card>
  );
}

function AchievementTiersDialog({
  data,
}: {
  data: AchievementLeaderboardView;
}) {
  const [period, setPeriod] = useState<AchievementPeriod>(data.period);
  const currentTiers = new Map(
    data.viewerAchievements.map((achievement) => [
      achievement.metric,
      achievement.tier,
    ]),
  );

  function isCurrentTier(metric: AchievementMetric, tier: AchievementTier) {
    return period === data.period && currentTiers.get(metric) === tier;
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        View achievement tiers
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Achievement tiers</DialogTitle>
          <DialogDescription>
            See every milestone from Stone through Diamond. Your current tiers
            are highlighted for the period selected on the leaderboard.
          </DialogDescription>
        </DialogHeader>

        <div
          role="tablist"
          aria-label="Achievement tier period"
          className="bg-muted grid grid-cols-2 p-1 sm:w-fit"
        >
          {(
            [
              ["month", "Monthly"],
              ["allTime", "All time"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              role="tab"
              aria-selected={period === value}
              variant={period === value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPeriod(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-lg border-collapse text-left">
            <caption className="sr-only">
              Point thresholds for each achievement tier and metric
            </caption>
            <thead>
              <tr className="border-border border-b">
                <th scope="col" className="px-3 py-3 text-xs uppercase">
                  Tier
                </th>
                {(["sent", "received", "total"] as const).map((metric) => (
                  <th
                    key={metric}
                    scope="col"
                    className="px-3 py-3 text-right text-xs uppercase"
                  >
                    {METRIC_LABELS[metric]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACHIEVEMENT_TIERS.map((tier) => (
                <tr key={tier} className="border-border border-b last:border-0">
                  <th scope="row" className="px-3 py-3 font-semibold">
                    {tier}
                  </th>
                  {(["sent", "received", "total"] as const).map((metric) => (
                    <td key={metric} className="px-3 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span>
                          {ACHIEVEMENT_THRESHOLDS[period][metric][
                            tier
                          ].toLocaleString()}{" "}
                          pts
                        </span>
                        {isCurrentTier(metric, tier) ? (
                          <Badge variant="secondary">Your tier</Badge>
                        ) : null}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-muted space-y-1 p-4 text-xs">
          <p>
            <strong>Sent:</strong> points awarded to all recipients.
          </p>
          <p>
            <strong>Received:</strong> points awarded to you.
          </p>
          <p>
            <strong>Total:</strong> sent and received points combined.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AchievementSection({ data }: AchievementSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateSelection(
    updates: Partial<{
      achievementPeriod: AchievementPeriod;
      metric: AchievementMetric;
      month: string;
    }>,
  ) {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.achievementPeriod) {
      params.set("achievementPeriod", updates.achievementPeriod);
      if (updates.achievementPeriod === "allTime") params.delete("month");
    }
    if (updates.metric) params.set("metric", updates.metric);
    if (updates.month) params.set("month", updates.month);
    startTransition(() => router.push(`/leaderboard?${params.toString()}`));
  }

  const selectedMonth = data.monthKey ?? data.currentMonthKey;
  const canMoveForward = selectedMonth < data.currentMonthKey;

  return (
    <section className="space-y-5" aria-labelledby="achievements-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="achievements-heading" className="text-xl font-semibold">
            Achievements
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Recognition milestones use prestige tiers from Stone to Diamond.
          </p>
        </div>
        <AchievementTiersDialog data={data} />
      </div>

      <Card size="sm">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Achievement period"
            className="bg-muted grid grid-cols-2 p-1"
          >
            {(
              [
                ["month", "Monthly"],
                ["allTime", "All time"],
              ] as const
            ).map(([period, label]) => (
              <Button
                key={period}
                type="button"
                role="tab"
                aria-selected={data.period === period}
                disabled={isPending}
                variant={data.period === period ? "secondary" : "ghost"}
                size="sm"
                onClick={() => updateSelection({ achievementPeriod: period })}
              >
                {label}
              </Button>
            ))}
          </div>

          {data.period === "month" ? (
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  updateSelection({ month: shiftMonthKey(selectedMonth, -1) })
                }
                aria-label="Previous month"
              >
                Previous
              </Button>
              <span className="min-w-32 text-center text-sm font-medium">
                {formatMonth(selectedMonth)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || !canMoveForward}
                onClick={() =>
                  updateSelection({ month: shiftMonthKey(selectedMonth, 1) })
                }
                aria-label="Next month"
              >
                Next
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-base font-semibold">Your achievements</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {data.viewerAchievements.map((achievement) => (
            <PersonalAchievementCard
              key={achievement.metric}
              achievement={achievement}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">All-user ranking</h3>
          <p className="text-muted-foreground text-sm">
            Compare achievement progress across every active teammate.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Achievement metric"
          className="bg-muted grid grid-cols-3 p-1 sm:inline-grid"
        >
          {(["sent", "received", "total"] as const).map((metric) => (
            <Button
              key={metric}
              type="button"
              role="tab"
              aria-selected={data.metric === metric}
              disabled={isPending}
              variant={data.metric === metric ? "secondary" : "ghost"}
              size="sm"
              onClick={() => updateSelection({ metric })}
            >
              {METRIC_LABELS[metric]}
            </Button>
          ))}
        </div>

        <ol
          className="bg-card ring-foreground/5 overflow-hidden shadow-sm ring-1"
          aria-label={`${METRIC_LABELS[data.metric]} achievement rankings`}
        >
          {data.entries.map((entry, index) => (
            <li key={entry.user.id}>
              <div
                className={`flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 ${
                  entry.isViewer ? "bg-muted/60" : ""
                }`}
              >
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
                    {entry.isViewer ? (
                      <span className="text-muted-foreground ml-1 font-normal">
                        (You)
                      </span>
                    ) : null}
                  </Link>
                  <span className="text-muted-foreground block truncate text-sm">
                    @{entry.user.handle}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-primary font-semibold">
                    {entry.amount} pts
                  </span>
                  <AchievementBadge progress={entry} />
                </div>
              </div>
              {index < data.entries.length - 1 ? <Separator /> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
