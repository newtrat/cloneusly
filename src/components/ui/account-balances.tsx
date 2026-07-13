import { RiGiftLine, RiHandCoinLine } from "@remixicon/react";

import { Card, CardContent } from "@/components/ui/card";

type AccountBalancesProps = {
  givingBalance: number;
  receivedBalance: number;
};

export function AccountBalances({
  givingBalance,
  receivedBalance,
}: AccountBalancesProps) {
  return (
    <Card size="sm" className="w-full py-0 shadow-none">
      <CardContent className="grid grid-cols-2 divide-x px-0">
        <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
          <div className="bg-muted hidden size-9 shrink-0 items-center justify-center sm:flex">
            <RiGiftLine
              className="text-muted-foreground size-4"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground block truncate text-xs font-medium tracking-wide">
              Giving points
            </span>
            <p className="truncate text-xl font-semibold tabular-nums">
              {givingBalance.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
          <div className="bg-muted hidden size-9 shrink-0 items-center justify-center sm:flex">
            <RiHandCoinLine
              className="text-muted-foreground size-4"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground block truncate text-xs font-medium tracking-wide">
              Received points
            </span>
            <p className="truncate text-xl font-semibold tabular-nums">
              {receivedBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AppShell({
  children,
  givingBalance,
  receivedBalance,
}: {
  children: React.ReactNode;
  givingBalance: number;
  receivedBalance: number;
  unreadCount?: number;
}) {
  return (
    <div>
      <AccountBalances
        givingBalance={givingBalance}
        receivedBalance={receivedBalance}
      />
      <div className="mt-4">{children}</div>
    </div>
  );
}
