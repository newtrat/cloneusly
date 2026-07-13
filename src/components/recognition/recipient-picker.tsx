"use client";

import { useCallback, useEffect, useState } from "react";

import { searchUsersAction } from "@/app/(app)/feed/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [open, setOpen] = useState(false);

  const search = useCallback(
    async (value: string) => {
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
        response.data.filter((user) => !selected.some((s) => s.id === user.id)),
      );
    },
    [selected],
  );

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
    setOpen(false);
  }

  function removeRecipient(userId: string) {
    onChange(selected.filter((u) => u.id !== userId));
  }

  return (
    <div className="space-y-2.5">
      <Label htmlFor="recipient-search">Recipients</Label>
      <div className="flex flex-wrap gap-2">
        {selected.map((user) => (
          <Badge key={user.id} variant="secondary" className="gap-1.5">
            {user.name}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              onClick={() => removeRecipient(user.id)}
              aria-label={`Remove ${user.name}`}
              className="text-muted-foreground hover:text-foreground size-5"
            >
              ×
            </Button>
          </Badge>
        ))}
      </div>
      <Popover
        open={open && !disabled && (results.length > 0 || searchError !== null)}
        onOpenChange={setOpen}
      >
        <PopoverTrigger
          nativeButton={false}
          render={
            <Input
              id="recipient-search"
              type="search"
              value={query}
              disabled={disabled}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              placeholder="Search by name or handle"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open && results.length > 0}
            />
          }
        />
        <PopoverContent
          align="start"
          className="w-(--anchor-width) min-w-72 gap-0 p-0"
        >
          {searchError ? (
            <Alert variant="destructive" className="border-0">
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          ) : (
            <Command shouldFilter={false}>
              <CommandList>
                <CommandGroup>
                  {results.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      disabled={disabled}
                      onSelect={() => addRecipient(user)}
                    >
                      <span>
                        {user.name}{" "}
                        <span className="text-muted-foreground">
                          @{user.handle}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
