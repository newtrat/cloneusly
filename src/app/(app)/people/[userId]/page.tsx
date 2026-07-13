import { notFound } from "next/navigation";

import { FeedEmpty, FeedList } from "@/components/feed/feed-list";
import { getUserActivity } from "@/lib/dal/user-activity";

type PeoplePageProps = {
  params: Promise<{ userId: string }>;
};

export default async function PeoplePage({ params }: PeoplePageProps) {
  const { userId } = await params;
  const activity = await getUserActivity({ userId });

  if (!activity.ok) {
    if (activity.error.code === "RECIPIENT_NOT_FOUND") {
      notFound();
    }
    return (
      <div role="alert" className="text-destructive">
        {activity.error.message}
      </div>
    );
  }

  const { user, sent, received } = activity.data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{user.name}</h1>
        <p className="text-muted-foreground">@{user.handle}</p>
      </header>

      <section aria-labelledby="sent-heading">
        <h2 id="sent-heading" className="mb-3 text-lg font-semibold">
          Sent recognition
        </h2>
        {sent.items.length === 0 ? (
          <FeedEmpty />
        ) : (
          <FeedList items={sent.items} />
        )}
      </section>

      <section aria-labelledby="received-heading">
        <h2 id="received-heading" className="mb-3 text-lg font-semibold">
          Received recognition
        </h2>
        {received.items.length === 0 ? (
          <FeedEmpty />
        ) : (
          <FeedList items={received.items} />
        )}
      </section>
    </div>
  );
}
