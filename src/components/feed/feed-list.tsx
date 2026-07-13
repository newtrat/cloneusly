import Link from "next/link";

import type { RecognitionCardView } from "@/lib/dal/recognition-feed";

import { RecognitionCard } from "@/components/recognition/recognition-card";

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
    <div
      className="rounded-lg border border-dashed border-border bg-white p-8 text-center"
      role="status"
    >
      <p className="text-muted-foreground">
        {filtered
          ? "No recognition matches these filters yet."
          : "No recognition has been sent yet. Be the first to celebrate a colleague!"}
      </p>
      {!filtered ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Use the composer above to send points and kudos.
        </p>
      ) : null}
    </div>
  );
}

export function FeedError({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
      role="alert"
    >
      <p className="text-sm text-destructive">{message}</p>
    </div>
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
    <Link href={`/people/${userId}`} className="font-semibold hover:text-primary">
      {name}
    </Link>
  );
}
