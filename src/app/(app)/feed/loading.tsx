import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeedLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading recognition feed"
    >
      <Skeleton className="h-8 w-48" />
      <Card size="sm">
        <CardHeader>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-4/5" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <span className="sr-only">Loading recognition…</span>
    </div>
  );
}
