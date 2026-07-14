"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { searchUsersAction } from "@/app/(app)/feed/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [userOpen, setUserOpen] = useState(false);

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
    setUserOpen(true);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setUserOpen(false);
      return;
    }
    const result = await searchUsersAction(query, 8);
    if (result.ok) {
      setSuggestions(result.data);
      setUserOpen(result.data.length > 0);
    }
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
    setUserOpen(false);
    startTransition(() => router.push("/feed"));
  }

  const hasFilters = Boolean(initialHashtag || initialUserId);

  return (
    <section aria-label="Feed filters">
      <Card size="sm">
        <CardHeader>
          <CardTitle>
            <h2>Filter feed</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleHashtagSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="feed-hashtag">Hashtag</Label>
              <Input
                id="feed-hashtag"
                type="text"
                value={hashtag}
                disabled={isPending}
                onChange={(e) => setHashtag(e.target.value)}
                placeholder="teamwork"
              />
            </div>
            <div className="min-w-0 space-y-1.5 lg:min-w-52">
              <Label htmlFor="feed-user">User</Label>
              <Popover
                open={userOpen && !isPending && suggestions.length > 0}
                onOpenChange={setUserOpen}
              >
                <PopoverTrigger
                  nativeButton={false}
                  render={
                    <Input
                      id="feed-user"
                      type="search"
                      value={userQuery}
                      disabled={isPending}
                      onFocus={() => setUserOpen(suggestions.length > 0)}
                      onChange={(e) => {
                        void handleUserSearch(e.target.value);
                      }}
                      placeholder="Search colleagues…"
                      autoComplete="off"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={userOpen && suggestions.length > 0}
                    />
                  }
                />
                <PopoverContent
                  align="start"
                  className="w-(--anchor-width) min-w-60 gap-0 p-0"
                >
                  <Command shouldFilter={false}>
                    <CommandList>
                      <CommandGroup>
                        {suggestions.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.id}
                            onSelect={() => {
                              setSelectedUser(user);
                              setUserQuery(user.name);
                              setSuggestions([]);
                              setUserOpen(false);
                            }}
                          >
                            {user.name} @{user.handle}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Apply
            </Button>
            {hasFilters ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={clearFilters}
                className="w-full sm:w-auto"
              >
                Clear filters
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
