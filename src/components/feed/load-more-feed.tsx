"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { getFeedAction } from "@/app/(app)/feed/actions";
import { FeedList } from "@/components/feed/feed-list";
import type { RecognitionCardView } from "@/lib/dal/recognition-feed";

type LoadMoreFeedProps = {
  initialCursor: string | null;
  filters: { userId?: string; hashtag?: string };
};

export function LoadMoreFeed({ initialCursor, filters }: LoadMoreFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [extraItems, setExtraItems] = useState<RecognitionCardView[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [error, setError] = useState<string | null>(null);

  if (!cursor) return null;

  async function loadMore() {
    setError(null);
    const result = await getFeedAction({
      cursor: cursor ?? undefined,
      userId: filters.userId,
      hashtag: filters.hashtag,
    });

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setExtraItems((prev) => [...prev, ...result.data.items]);
    setCursor(result.data.nextCursor);

    if (result.data.nextCursor) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", result.data.nextCursor);
      startTransition(() => {
        router.replace(`/feed?${params.toString()}`, { scroll: false });
      });
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {extraItems.length > 0 ? <FeedList items={extraItems} /> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void loadMore()}
        disabled={isPending}
        className="w-full rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        aria-busy={isPending}
      >
        {isPending ? "Loading…" : "Load more"}
      </button>
    </div>
  );
}
