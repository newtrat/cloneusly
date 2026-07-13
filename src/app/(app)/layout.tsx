import Link from "next/link";

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/feed" className="text-lg font-semibold text-primary">
            Cloneusly
          </Link>
          <Navigation unreadCount={account?.unreadNotificationCount ?? 0} />
        </div>
        {account ? (
          <div className="mx-auto max-w-5xl px-4 pb-4">
            <AccountBalances
              givingBalance={account.givingBalance}
              receivedBalance={account.receivedBalance}
            />
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
