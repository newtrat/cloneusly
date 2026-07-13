"use client";

import { useCallback, useEffect, useState } from "react";

import { searchUsersAction } from "@/app/(app)/feed/actions";
import type { UserSummary } from "@/lib/dal/current-user";

type RecipientPickerProps = {
  selected: UserSummary[];
  onChange: (recipients: UserSummary[]) => void;
  disabled?: boolean;
};

export function RecipientPicker({
  selected,
  onChange,
  disabled,
}: RecipientPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const search = useCallback(async (value: string) => {
    if (value.trim().length < 1) {
      setResults([]);
      return;
    }
    const response = await searchUsersAction(value.trim(), 10);
    if (!response.ok) {
      setSearchError(response.error.message);
      setResults([]);
      return;
    }
    setSearchError(null);
    setResults(
      response.data.filter(
        (user) => !selected.some((s) => s.id === user.id),
      ),
    );
  }, [selected]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void search(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  function addRecipient(user: UserSummary) {
    if (selected.some((s) => s.id === user.id)) return;
    onChange([...selected, user]);
    setQuery("");
    setResults([]);
  }

  function removeRecipient(userId: string) {
    onChange(selected.filter((u) => u.id !== userId));
  }

  return (
    <div className="space-y-2">
      <label htmlFor="recipient-search" className="block text-sm font-medium">
        Recipients
      </label>
      <div className="flex flex-wrap gap-2">
        {selected.map((user) => (
          <span
            key={user.id}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
          >
            {user.name}
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeRecipient(user.id)}
              aria-label={`Remove ${user.name}`}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        id="recipient-search"
        type="search"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or handle"
        className="w-full rounded-md border border-border px-3 py-2"
        autoComplete="off"
      />
      {searchError ? (
        <p className="text-sm text-destructive">{searchError}</p>
      ) : null}
      {results.length > 0 ? (
        <ul className="rounded-md border border-border bg-white shadow-sm">
          {results.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => addRecipient(user)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
              >
                <span>
                  {user.name}{" "}
                  <span className="text-muted-foreground">@{user.handle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
