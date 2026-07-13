import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { GET } from "@/app/api/cron/monthly-grants/route";

describe("monthly grant cron route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret-12345";
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test";
    process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? "x".repeat(32);
    process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns 401 without valid authorization", async () => {
    const { resetEnvCache } = await import("@/lib/env");
    resetEnvCache();

    const response = await GET(
      new Request("http://localhost/api/cron/monthly-grants"),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it("returns 503 when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const { resetEnvCache } = await import("@/lib/env");
    resetEnvCache();

    const { GET: handler } = await import("@/app/api/cron/monthly-grants/route");
    const response = await handler(
      new Request("http://localhost/api/cron/monthly-grants", {
        headers: { authorization: "Bearer anything" },
      }),
    );
    expect(response.status).toBe(503);
  });

  it("returns safe counters on authorized request", async () => {
    vi.doMock("@/lib/domain/points/reconcile-monthly-grants", () => ({
      reconcileMonthlyGrants: vi.fn(async () => ({
        grantMonth: "2026-07-01",
        eligibleUsers: 2,
        grantedUsers: 1,
        alreadyGrantedUsers: 1,
        failedUsers: 0,
        durationMs: 10,
      })),
    }));

    const { resetEnvCache } = await import("@/lib/env");
    resetEnvCache();
    const { GET: handler } = await import("@/app/api/cron/monthly-grants/route");

    const response = await handler(
      new Request("http://localhost/api/cron/monthly-grants", {
        headers: { authorization: "Bearer test-cron-secret-12345" },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.grantMonth).toBe("2026-07-01");
    expect(body.data).not.toHaveProperty("email");
  });
});
