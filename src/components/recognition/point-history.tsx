import type { PointHistoryEntry } from "@/lib/dal/point-history";

type PointHistoryProps = {
  entries: PointHistoryEntry[];
};

export function PointHistory({ entries }: PointHistoryProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        No point history yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-white" aria-label="Point history">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${
            entry.testActivity ? "bg-amber-50" : ""
          }`}
        >
          <div>
            <p className="font-medium">{entry.label}</p>
            <p className="text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString()}
              {entry.testActivity ? " · Test activity" : ""}
            </p>
          </div>
          <span
            className={`shrink-0 font-semibold ${
              entry.delta >= 0 ? "text-green-700" : "text-destructive"
            }`}
            aria-label={`${entry.delta >= 0 ? "Credit" : "Debit"} ${Math.abs(entry.delta)} ${entry.bucket.toLowerCase()} points`}
          >
            {entry.delta >= 0 ? "+" : ""}
            {entry.delta}
          </span>
        </li>
      ))}
    </ul>
  );
}
