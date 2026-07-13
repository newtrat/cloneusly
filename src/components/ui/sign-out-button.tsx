"use client";

import { RiLogoutBoxRLine } from "@remixicon/react";

import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() =>
        signOut({
          fetchOptions: {
            onSuccess: () => window.location.assign("/login"),
          },
        })
      }
      className={cn("justify-start", className)}
    >
      <RiLogoutBoxRLine data-icon="inline-start" aria-hidden="true" />
      Sign out
    </Button>
  );
}
