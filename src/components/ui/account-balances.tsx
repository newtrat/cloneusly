type AccountBalancesProps = {
  givingBalance: number;
  receivedBalance: number;
};

export function AccountBalances({
  givingBalance,
  receivedBalance,
}: AccountBalancesProps) {
  return (
    <div className="flex flex-wrap gap-4 rounded-md bg-muted px-4 py-3 text-sm">
      <div>
        <span className="text-muted-foreground">Giving points</span>
        <p className="text-lg font-semibold">{givingBalance.toLocaleString()}</p>
      </div>
      <div>
        <span className="text-muted-foreground">Received points</span>
        <p className="text-lg font-semibold">
          {receivedBalance.toLocaleString()}
        </p>
      </div>
    </div>
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
