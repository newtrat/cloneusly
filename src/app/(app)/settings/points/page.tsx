import { Suspense } from "react";

import { ConversionForm } from "@/components/recognition/conversion-form";
import { PointHistory } from "@/components/recognition/point-history";
import { TestTopUpForm } from "@/components/recognition/test-topup-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPointHistoryAction } from "@/app/(app)/settings/points/actions";
import { getCurrentAccount } from "@/lib/dal/point-accounts";

export default async function PointsSettingsPage() {
  const [accountResult, historyResult] = await Promise.all([
    getCurrentAccount(),
    getPointHistoryAction(undefined, 50),
  ]);

  const account = accountResult.ok ? accountResult.data : null;
  const history = historyResult.ok ? historyResult.data.items : [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Points</h1>
      </header>

      {account ? (
        <Card size="sm">
          <CardContent className="grid gap-4 min-[440px]:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest">
                Giving
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {account.givingBalance}
              </p>
            </div>
            <div className="border-border border-t pt-4 min-[440px]:border-t-0 min-[440px]:border-l min-[440px]:pt-0 min-[440px]:pl-4">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest">
                Received
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {account.receivedBalance}
              </p>
            </div>
            {account.role === "TESTER" ? (
              <Badge variant="secondary" className="min-[440px]:col-span-2">
                Tester account
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {account ? (
        <ConversionForm receivedBalance={account.receivedBalance} />
      ) : null}

      {account?.role === "TESTER" && account.testTopUpsEnabled ? (
        <TestTopUpForm maxAmount={1000} />
      ) : null}

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-3 text-lg font-semibold">
          Point history
        </h2>
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading point history"
              className="space-y-px"
            >
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          }
        >
          <PointHistory entries={history} />
        </Suspense>
      </section>
    </div>
  );
}
