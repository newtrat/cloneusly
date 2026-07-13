import Link from "next/link";

import { SignOutButton } from "@/components/ui/sign-out-button";

type NavigationProps = {
  unreadCount: number;
};

export function Navigation({ unreadCount }: NavigationProps) {
  return (
    <nav aria-label="Main" className="flex items-center gap-4 text-sm">
      <Link href="/feed" className="hover:text-primary">
        Feed
      </Link>
      <Link href="/leaderboard" className="hover:text-primary">
        Leaderboard
      </Link>
      <Link href="/notifications" className="relative hover:text-primary">
        Notifications
        {unreadCount > 0 ? (
          <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
      <Link href="/settings/points" className="hover:text-primary">
        Points
      </Link>
      <SignOutButton />
    </nav>
  );
}
