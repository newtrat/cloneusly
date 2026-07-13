import { Suspense } from "react";

import { ConversionForm } from "@/components/recognition/conversion-form";
import { PointHistory } from "@/components/recognition/point-history";
import { TestTopUpForm } from "@/components/recognition/test-topup-form";
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
        {account ? (
          <p className="mt-2 text-muted-foreground">
            Giving: <strong>{account.givingBalance}</strong> · Received:{" "}
            <strong>{account.receivedBalance}</strong>
          </p>
        ) : null}
      </header>

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
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading history…</p>}>
          <PointHistory entries={history} />
        </Suspense>
      </section>
    </div>
  );
}
