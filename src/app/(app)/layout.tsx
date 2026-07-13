import Link from "next/link";
import { RiSparkling2Fill } from "@remixicon/react";

import { AccountBalances } from "@/components/ui/account-balances";
import { Navigation } from "@/components/ui/navigation";
import { getCurrentAccount } from "@/lib/dal/point-accounts";
import { requireActiveUserOrRedirect } from "@/lib/auth/require-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireActiveUserOrRedirect();
  const accountResult = await getCurrentAccount();
  const account = accountResult.ok ? accountResult.data : null;

  return (
    <div className="bg-muted/30 min-h-screen overflow-x-clip">
      <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/feed"
            className="focus-visible:ring-ring flex min-w-0 items-center gap-2.5 focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center">
              <RiSparkling2Fill className="size-4" aria-hidden="true" />
            </span>
            <span className="font-heading truncate text-lg font-semibold tracking-wider uppercase">
              Cloneusly
            </span>
          </Link>
          <Navigation unreadCount={account?.unreadNotificationCount ?? 0} />
        </div>
        {account ? (
          <div className="bg-background border-t">
            <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6">
              <AccountBalances
                givingBalance={account.givingBalance}
                receivedBalance={account.receivedBalance}
              />
            </div>
          </div>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
