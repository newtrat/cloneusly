import { notFound } from "next/navigation";

import { FeedEmpty, FeedList } from "@/components/feed/feed-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
      <Alert variant="destructive">
        <AlertTitle>Unable to load profile</AlertTitle>
        <AlertDescription>{activity.error.message}</AlertDescription>
      </Alert>
    );
  }

  const { user, sent, received } = activity.data;

  return (
    <div className="space-y-8">
      <Card size="sm">
        <CardContent>
          <header className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold">{user.name}</h1>
            <Badge variant="secondary">@{user.handle}</Badge>
          </header>
        </CardContent>
      </Card>

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
