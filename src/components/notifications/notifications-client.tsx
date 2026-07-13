"use client";

import Link from "next/link";
import { useState } from "react";

import {
  getNotificationsAction,
  markNotificationsReadAction,
} from "@/app/(app)/notifications/actions";
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void refresh(false)}
          className={`rounded-md px-3 py-1.5 text-sm ${
            !unreadOnly ? "bg-primary text-primary-foreground" : "border border-border"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => void refresh(true)}
          className={`rounded-md px-3 py-1.5 text-sm ${
            unreadOnly ? "bg-primary text-primary-foreground" : "border border-border"
          }`}
        >
          Unread only
        </button>
        <button
          type="button"
          disabled={pending || selected.size === 0}
          onClick={() => void markSelected()}
          className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Mark selected read
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void markAll()}
          className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-muted-foreground" role="status">
          No notifications{unreadOnly ? " unread" : ""}.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                disabled={pending || item.readAt !== null}
                onChange={() => toggleSelect(item.id)}
                aria-label={`Select notification from ${item.actor.name}`}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <p className={item.readAt ? "text-muted-foreground" : "font-medium"}>
                  <Link
                    href={`/people/${item.actor.id}`}
                    className="hover:text-primary"
                  >
                    {item.actor.name}
                  </Link>{" "}
                  {TYPE_LABELS[item.type]}
                </p>
                <p className="text-sm text-muted-foreground">
                  <Link href="/feed" className="hover:text-primary">
                    View recognition
                  </Link>
                  {" · "}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {cursor ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          className="w-full rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Load more
        </button>
      ) : null}
    </div>
  );
}
