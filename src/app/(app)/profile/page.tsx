import { RiSlackFill } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/require-user";

export default async function ProfilePage() {
  const user = await requireUser();
  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-wide">
          Profile
        </h1>
        <p className="text-muted-foreground text-sm">
          Your Cloneusly account details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <CardTitle>
                <h2 className="truncate">{user.name}</h2>
              </CardTitle>
              <CardDescription className="truncate">
                @{user.handle}
              </CardDescription>
            </div>
            <Badge className="ml-auto">{user.role}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="divide-border divide-y text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="truncate font-medium">{user.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-medium">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Handle</dt>
              <dd className="truncate font-medium">@{user.handle}</dd>
            </div>
          </dl>
          <p className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
            <RiSlackFill className="size-3.5" aria-hidden="true" />
            Your name is sourced from your Slack profile.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
