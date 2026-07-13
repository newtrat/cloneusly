import { Suspense } from "react";

import { FeedEmpty, FeedError, FeedList } from "@/components/feed/feed-list";
import { FeedFilters } from "@/components/feed/feed-filters";
import { LoadMoreFeed } from "@/components/feed/load-more-feed";
import { RecognitionForm } from "@/components/recognition/recognition-form";
import { getFeed } from "@/lib/dal/recognition-feed";
import { prisma } from "@/lib/prisma";

type FeedPageProps = {
  searchParams: Promise<{
    hashtag?: string;
    userId?: string;
    cursor?: string;
  }>;
};

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const hashtag = params.hashtag;
  const userId = params.userId;

  let initialUserName = "";
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    initialUserName = user?.name ?? "";
  }

  const feedResult = await getFeed({
    userId,
    hashtag,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Recognition</h1>

      <RecognitionForm />

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
        <FeedFilters
          initialHashtag={hashtag ?? ""}
          initialUserId={userId ?? ""}
          initialUserName={initialUserName}
        />
      </Suspense>

      <section aria-label="Company feed">
        <h2 className="mb-3 text-lg font-semibold">Company feed</h2>
        {!feedResult.ok ? (
          <FeedError message={feedResult.error.message} />
        ) : feedResult.data.items.length === 0 ? (
          <FeedEmpty filtered={Boolean(hashtag || userId)} />
        ) : (
          <>
            <FeedList items={feedResult.data.items} />
            <LoadMoreFeed
              initialCursor={feedResult.data.nextCursor}
              filters={{ userId, hashtag }}
            />
          </>
        )}
      </section>
    </div>
  );
}
