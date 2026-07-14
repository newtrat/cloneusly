import type { PointHistoryEntry } from "@/lib/dal/point-history";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type PointHistoryProps = {
  entries: PointHistoryEntry[];
};

export function PointHistory({ entries }: PointHistoryProps) {
  if (entries.length === 0) {
    return (
      <Card className="border border-dashed shadow-none" role="status">
        <CardContent className="text-muted-foreground py-8 text-center">
          No point history yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul
      className="bg-card ring-foreground/5 overflow-hidden shadow-sm ring-1"
      aria-label="Point history"
    >
      {entries.map((entry, index) => (
        <li key={entry.id}>
          <div
            className={`flex items-start justify-between gap-4 px-4 py-4 text-sm sm:px-6 ${
              entry.testActivity ? "bg-amber-50/60 dark:bg-amber-950/20" : ""
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{entry.label}</p>
                {entry.testActivity ? (
                  <Badge variant="secondary">Test activity</Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-1">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
            <Badge
              variant={entry.delta >= 0 ? "default" : "destructive"}
              className="shrink-0 text-xs"
              aria-label={`${entry.delta >= 0 ? "Credit" : "Debit"} ${Math.abs(entry.delta)} ${entry.bucket.toLowerCase()} points`}
            >
              {entry.delta >= 0 ? "+" : ""}
              {entry.delta}
            </Badge>
          </div>
          {index < entries.length - 1 ? <Separator /> : null}
        </li>
      ))}
    </ul>
  );
}
