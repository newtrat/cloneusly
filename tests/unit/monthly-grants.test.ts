import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatGrantMonth,
  getCompanyLocalGrantMonth,
  monthlyGrantIdempotencyKey,
  MONTHLY_GRANT_IDEMPOTENCY_SCOPE,
} from "@/lib/domain/points/grant-month";

describe("monthly grants", () => {
  beforeEach(() => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    process.env.BETTER_AUTH_SECRET ??= "x".repeat(32);
    process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes company-local grant month from UTC now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T15:00:00.000Z"));
    const month = getCompanyLocalGrantMonth();
    expect(formatGrantMonth(month)).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("builds stable idempotency keys per user and month", () => {
    const month = new Date("2026-07-01T00:00:00.000Z");
    expect(monthlyGrantIdempotencyKey("user-1", month)).toBe(
      "user-1:2026-07-01",
    );
  });

  it("uses system monthly grant scope", () => {
    expect(MONTHLY_GRANT_IDEMPOTENCY_SCOPE).toBe("system:monthly-grants");
  });
});
