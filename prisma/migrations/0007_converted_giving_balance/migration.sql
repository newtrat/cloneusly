-- Track the portion of the giving balance that came from converting received
-- points. This portion is spent only after the monthly allowance and is
-- preserved across the monthly allowance reset (it lasts until used).
ALTER TABLE "point_account"
  ADD COLUMN "convertedGivingBalance" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "point_account"
  ADD CONSTRAINT "point_account_convertedGivingBalance_check"
  CHECK ("convertedGivingBalance" >= 0);
