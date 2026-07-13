"use client";

import { signOut } from "@/lib/auth/client";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ fetchOptions: { onSuccess: () => window.location.assign("/login") } })}
      className="hover:text-primary"
    >
      Sign out
    </button>
  );
}
