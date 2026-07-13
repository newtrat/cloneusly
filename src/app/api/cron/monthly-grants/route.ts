import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { reconcileMonthlyGrants } from "@/lib/domain/points/reconcile-monthly-grants";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  let env;
  try {
    env = getEnv();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CONFIGURATION_ERROR",
          message: "Server configuration is invalid.",
        },
      },
      { status: 503 },
    );
  }

  if (!env.CRON_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CONFIGURATION_ERROR",
          message: "Cron secret is not configured.",
        },
      },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      },
      { status: 401 },
    );
  }

  const result = await reconcileMonthlyGrants();

  if (result.failedUsers > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INCOMPLETE_RECONCILIATION",
          message: "Some monthly grants could not be processed.",
        },
        data: result,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: result });
}
