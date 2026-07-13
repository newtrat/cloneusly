import { NotificationsClient } from "@/components/notifications/notifications-client";
import { getNotifications } from "@/lib/dal/notifications";

export default async function NotificationsPage() {
  const result = await getNotifications({ limit: 20 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recognition activity involving you.
        </p>
      </header>

      {result.ok ? (
        <NotificationsClient
          initialItems={result.data.items}
          initialCursor={result.data.nextCursor}
        />
      ) : (
        <p role="alert" className="text-destructive">
          {result.error.message}
        </p>
      )}
    </div>
  );
}
