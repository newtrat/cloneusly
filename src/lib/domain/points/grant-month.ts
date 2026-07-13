import "server-only";

import { getEnv } from "@/lib/env";

export function getCompanyLocalGrantMonth(now: Date = new Date()): Date {
  const env = getEnv();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: env.COMPANY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  if (!year || !month) {
    throw new Error("Unable to compute company-local grant month.");
  }
  return new Date(`${year}-${month}-01T00:00:00.000Z`);
}

export function formatGrantMonth(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthlyGrantIdempotencyKey(
  userId: string,
  grantMonth: Date,
): string {
  return `${userId}:${formatGrantMonth(grantMonth)}`;
}

export const MONTHLY_GRANT_AMOUNT = 100;
export const MONTHLY_GRANT_IDEMPOTENCY_SCOPE = "system:monthly-grants";
