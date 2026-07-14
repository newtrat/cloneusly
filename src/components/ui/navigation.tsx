"use client";

import Link from "next/link";
import { useState } from "react";
import {
  RiHome5Line,
  RiMenuLine,
  RiNotification3Line,
  RiSettings3Line,
  RiTrophyLine,
  RiUser3Line,
} from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/ui/sign-out-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavigationProps = {
  unreadCount: number;
};

const links = [
  { href: "/feed", label: "Feed", icon: RiHome5Line },
  { href: "/leaderboard", label: "Leaderboard", icon: RiTrophyLine },
  {
    href: "/notifications",
    label: "Notifications",
    icon: RiNotification3Line,
  },
  { href: "/settings/points", label: "Points", icon: RiSettings3Line },
] as const;

function UnreadBadge({ unreadCount }: NavigationProps) {
  if (unreadCount <= 0) {
    return null;
  }

  return (
    <Badge className="bg-primary text-primary-foreground min-w-5 rounded-full px-1.5 py-0.5 text-[0.625rem] leading-none">
      {unreadCount > 99 ? "99+" : unreadCount}
    </Badge>
  );
}

export function Navigation({ unreadCount }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav aria-label="Main" className="shrink-0">
      <div className="hidden items-center gap-1 md:flex">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5",
            )}
          >
            {label}
            {label === "Notifications" ? (
              <UnreadBadge unreadCount={unreadCount} />
            ) : null}
          </Link>
        ))}
        <Link
          href="/profile"
          aria-label="Profile"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <RiUser3Line aria-hidden="true" />
        </Link>
        <SignOutButton />
      </div>

      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Open main menu"
              />
            }
          >
            <RiMenuLine aria-hidden="true" />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[min(20rem,calc(100vw-2rem))]"
          >
            <SheetHeader className="border-b p-6 pr-16">
              <SheetTitle>Cloneusly</SheetTitle>
              <SheetDescription>Navigate your community</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-1 p-4">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-11 w-full justify-start px-4",
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon data-icon="inline-start" aria-hidden="true" />
                  {label}
                  {label === "Notifications" ? (
                    <UnreadBadge unreadCount={unreadCount} />
                  ) : null}
                </Link>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-1 border-t p-4">
              <Link
                href="/profile"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-11 w-full justify-start px-4",
                )}
                onClick={() => setMobileOpen(false)}
              >
                <RiUser3Line data-icon="inline-start" aria-hidden="true" />
                Profile
              </Link>
              <SignOutButton className="h-11 w-full px-4" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
