import { NotificationsClient } from "@/components/notifications/notifications-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getNotifications } from "@/lib/dal/notifications";

export default async function NotificationsPage() {
  const result = await getNotifications({ limit: 20 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Recognition activity involving you.
        </p>
      </header>

      {result.ok ? (
        <NotificationsClient
          initialItems={result.data.items}
          initialCursor={result.data.nextCursor}
        />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Unable to load notifications</AlertTitle>
          <AlertDescription>{result.error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
