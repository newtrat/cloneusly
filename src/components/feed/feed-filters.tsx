"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { searchUsersAction } from "@/app/(app)/feed/actions";
import type { UserSummary } from "@/lib/dal/current-user";

type FeedFiltersProps = {
  initialHashtag?: string;
  initialUserId?: string;
  initialUserName?: string;
};

export function FeedFilters({
  initialHashtag = "",
  initialUserId = "",
  initialUserName = "",
}: FeedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [hashtag, setHashtag] = useState(initialHashtag);
  const [userQuery, setUserQuery] = useState(initialUserName);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(
    initialUserId && initialUserName
      ? { id: initialUserId, handle: "", name: initialUserName, image: null }
      : null,
  );
  const [suggestions, setSuggestions] = useState<UserSummary[]>([]);

  const applyFilters = useCallback(
    (next: { hashtag?: string; userId?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.hashtag) params.set("hashtag", next.hashtag);
      else params.delete("hashtag");
      if (next.userId) params.set("userId", next.userId);
      else params.delete("userId");
      params.delete("cursor");
      startTransition(() => {
        router.push(`/feed?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  async function handleUserSearch(query: string) {
    setUserQuery(query);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const result = await searchUsersAction(query, 8);
    if (result.ok) setSuggestions(result.data);
  }

  function handleHashtagSubmit(event: React.FormEvent) {
    event.preventDefault();
    applyFilters({
      hashtag: hashtag.trim().replace(/^#/, "") || undefined,
      userId: selectedUser?.id,
    });
  }

  function clearFilters() {
    setHashtag("");
    setUserQuery("");
    setSelectedUser(null);
    setSuggestions([]);
    startTransition(() => router.push("/feed"));
  }

  const hasFilters = Boolean(initialHashtag || initialUserId);

  return (
    <section aria-label="Feed filters" className="rounded-lg border border-border bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">Filter feed</h2>
      <form onSubmit={handleHashtagSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="feed-hashtag" className="mb-1 block text-sm font-medium">
            Hashtag
          </label>
          <input
            id="feed-hashtag"
            type="text"
            value={hashtag}
            disabled={isPending}
            onChange={(e) => setHashtag(e.target.value)}
            placeholder="teamwork"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
        <div className="relative min-w-[200px]">
          <label htmlFor="feed-user" className="mb-1 block text-sm font-medium">
            User
          </label>
          <input
            id="feed-user"
            type="search"
            value={userQuery}
            disabled={isPending}
            onChange={(e) => {
              void handleUserSearch(e.target.value);
            }}
            placeholder="Search colleagues…"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
            autoComplete="off"
          />
          {suggestions.length > 0 ? (
            <ul
              className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-white shadow-sm"
              role="listbox"
            >
              {suggestions.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setSelectedUser(user);
                      setUserQuery(user.name);
                      setSuggestions([]);
                    }}
                  >
                    {user.name} @{user.handle}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          Apply
        </button>
        {hasFilters ? (
          <button
            type="button"
            disabled={isPending}
            onClick={clearFilters}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            Clear filters
          </button>
        ) : null}
      </form>
    </section>
  );
}
