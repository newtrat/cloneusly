"use client";

import Link from "next/link";
import { useState } from "react";

import {
  getNotificationsAction,
  markNotificationsReadAction,
} from "@/app/(app)/notifications/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { NotificationView } from "@/lib/dal/notifications";

type NotificationsClientProps = {
  initialItems: NotificationView[];
  initialCursor: string | null;
};

const TYPE_LABELS: Record<NotificationView["type"], string> = {
  RECOGNITION_RECEIVED: "recognized you",
  RECOGNITION_REACTION: "reacted to your recognition",
  RECOGNITION_COMMENT: "commented on your recognition",
};

export function NotificationsClient({
  initialItems,
  initialCursor,
}: NotificationsClientProps) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(unread: boolean) {
    setUnreadOnly(unread);
    const result = await getNotificationsAction(undefined, unread);
    if (result.ok) {
      setItems(result.data.items);
      setCursor(result.data.nextCursor);
      setSelected(new Set());
    }
  }

  async function loadMore() {
    if (!cursor) return;
    const result = await getNotificationsAction(cursor, unreadOnly);
    if (result.ok) {
      setItems((prev) => [...prev, ...result.data.items]);
      setCursor(result.data.nextCursor);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function markSelected() {
    setPending(true);
    setError(null);
    const result = await markNotificationsReadAction({
      mode: "selected",
      notificationIds: [...selected],
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh(unreadOnly);
  }

  async function markAll() {
    setPending(true);
    setError(null);
    const result = await markNotificationsReadAction({ mode: "all" });
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await refresh(unreadOnly);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div
          className="bg-muted grid grid-cols-2 p-1"
          aria-label="Notification filter"
        >
          <Button
            type="button"
            size="sm"
            variant={!unreadOnly ? "secondary" : "ghost"}
            aria-pressed={!unreadOnly}
            onClick={() => void refresh(false)}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant={unreadOnly ? "secondary" : "ghost"}
            aria-pressed={unreadOnly}
            onClick={() => void refresh(true)}
          >
            Unread only
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || selected.size === 0}
            onClick={() => void markSelected()}
          >
            Mark selected read
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void markAll()}
          >
            Mark all read
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <Card className="border border-dashed shadow-none" role="status">
          <CardContent className="text-muted-foreground py-8 text-center">
            No notifications{unreadOnly ? " unread" : ""}.
          </CardContent>
        </Card>
      ) : (
        <ul className="bg-card ring-foreground/5 overflow-hidden shadow-sm ring-1">
          {items.map((item, index) => (
            <li key={item.id}>
              <div className="flex items-start gap-3 px-4 py-4 sm:px-6">
                <Checkbox
                  checked={selected.has(item.id)}
                  disabled={pending || item.readAt !== null}
                  onCheckedChange={() => toggleSelect(item.id)}
                  aria-label={`Select notification from ${item.actor.name}`}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      item.readAt ? "text-muted-foreground" : "font-medium"
                    }
                  >
                    <Link
                      href={`/people/${item.actor.id}`}
                      className="hover:text-primary"
                    >
                      {item.actor.name}
                    </Link>{" "}
                    {TYPE_LABELS[item.type]}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    <Link href="/feed" className="hover:text-primary">
                      View recognition
                    </Link>
                    <span aria-hidden="true"> · </span>
                    <span className="block min-[440px]:inline">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>
              {index < items.length - 1 ? <Separator /> : null}
            </li>
          ))}
        </ul>
      )}

      {cursor ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void loadMore()}
          className="w-full"
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}
