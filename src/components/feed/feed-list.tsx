import Link from "next/link";

import type { RecognitionCardView } from "@/lib/dal/recognition-feed";

import { RecognitionCard } from "@/components/recognition/recognition-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

type FeedListProps = {
  items: RecognitionCardView[];
};

export function FeedList({ items }: FeedListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-4" aria-label="Recognition feed">
      {items.map((item) => (
        <li key={item.id}>
          <RecognitionCard {...item} />
        </li>
      ))}
    </ul>
  );
}

export function FeedEmpty({ filtered }: { filtered?: boolean }) {
  return (
    <Card className="border border-dashed shadow-none" role="status">
      <CardContent className="py-8 text-center">
        <p className="font-medium">
          {filtered ? "No matching recognition" : "No recognition yet"}
        </p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          {filtered
            ? "No recognition matches these filters yet."
            : "No recognition has been sent yet. Be the first to celebrate a colleague! Use the composer above to send points and kudos."}
        </p>
      </CardContent>
    </Card>
  );
}

export function FeedError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Unable to load recognition</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function UserProfileLink({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  return (
    <Link
      href={`/people/${userId}`}
      className="hover:text-primary font-semibold"
    >
      {name}
    </Link>
  );
}
